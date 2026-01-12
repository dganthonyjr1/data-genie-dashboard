import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retell-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log('Retell webhook received:', JSON.stringify(payload, null, 2));

    const { event, call } = payload;

    if (!event || !call) {
      console.log('Invalid webhook payload - missing event or call');
      return new Response(
        JSON.stringify({ success: true, message: 'Acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callId = call.call_id;
    console.log(`Processing Retell event: ${event} for call: ${callId}`);

    // Map Retell events to our status
    let newStatus: string | null = null;
    let outcome: string | null = null;
    let duration: number | null = null;
    let notes: any = {};

    switch (event) {
      case 'call_started':
        newStatus = 'in_progress';
        outcome = 'call_started';
        notes.start_timestamp = call.start_timestamp;
        break;

      case 'call_ended':
        newStatus = 'completed';
        duration = call.duration_ms ? Math.round(call.duration_ms / 1000) : 0;
        notes.end_timestamp = call.end_timestamp;
        notes.disconnection_reason = call.disconnection_reason;
        notes.transcript = call.transcript;
        notes.recording_url = call.recording_url;
        notes.public_log_url = call.public_log_url;
        
        // Determine outcome based on call analysis
        if (call.call_analysis) {
          const analysis = call.call_analysis;
          notes.call_analysis = analysis;
          
          if (analysis.call_successful === true) {
            outcome = 'interested';
          } else if (analysis.call_successful === false) {
            outcome = 'not_interested';
          } else if (call.disconnection_reason === 'user_hangup') {
            outcome = 'hangup';
          } else if (call.disconnection_reason === 'voicemail_reached') {
            outcome = 'voicemail';
          } else {
            outcome = 'completed';
          }
          
          notes.user_sentiment = analysis.user_sentiment;
          notes.call_summary = analysis.call_summary;
        } else {
          outcome = call.disconnection_reason === 'voicemail_reached' ? 'voicemail' : 'completed';
        }
        break;

      case 'call_analyzed':
        // Update with detailed analysis
        notes.call_analysis = call.call_analysis;
        notes.transcript = call.transcript;
        notes.call_summary = call.call_analysis?.call_summary;
        notes.user_sentiment = call.call_analysis?.user_sentiment;
        
        if (call.call_analysis?.call_successful === true) {
          outcome = 'interested';
        } else if (call.call_analysis?.call_successful === false) {
          outcome = 'not_interested';
        }
        break;

      case 'call_failed':
        newStatus = 'failed';
        outcome = 'failed';
        notes.error = call.error_message || 'Call failed';
        notes.disconnection_reason = call.disconnection_reason;
        break;

      default:
        console.log(`Unhandled event type: ${event}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Event acknowledged' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (newStatus) {
      updateData.status = newStatus;
    }
    if (outcome) {
      updateData.outcome = outcome;
    }
    if (duration !== null) {
      updateData.duration = duration;
    }

    // Merge notes with existing notes
    const { data: existingRecord, error: fetchError } = await supabase
      .from('call_records')
      .select('notes')
      .eq('call_id', callId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing record:', fetchError);
    }

    let existingNotes = {};
    if (existingRecord?.notes) {
      try {
        existingNotes = typeof existingRecord.notes === 'string' 
          ? JSON.parse(existingRecord.notes) 
          : existingRecord.notes;
      } catch (e) {
        console.error('Error parsing existing notes:', e);
      }
    }

    updateData.notes = JSON.stringify({
      ...existingNotes,
      ...notes,
      recording_url: call.recording_url || notes.recording_url || (existingNotes as any).recording_url,
      last_webhook_event: event,
      last_updated: new Date().toISOString(),
    });

    // Update call record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('call_records')
      .update(updateData)
      .eq('call_id', callId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating call record:', updateError);
      
      // If no record found, try to find by metadata
      if (updateError.code === 'PGRST116') {
        console.log('No call record found for call_id, checking metadata...');
        
        // Try to create a new record if we have user_id in metadata
        if (call.metadata?.user_id) {
          const { error: insertError } = await supabase
            .from('call_records')
            .insert({
              user_id: call.metadata.user_id,
              call_id: callId,
              facility_name: call.metadata.facility_name || 'Unknown',
              phone_number: call.to_number || 'Unknown',
              status: newStatus || 'unknown',
              outcome: outcome || 'unknown',
              duration: duration || 0,
              notes: updateData.notes,
            });

          if (insertError) {
            console.error('Error inserting new call record:', insertError);
          } else {
            console.log('Created new call record from webhook');
          }
        }
      }
    } else {
      console.log('Call record updated successfully:', updatedRecord?.id);

      // Create notification for call completion
      if (event === 'call_ended' && updatedRecord) {
        const notificationTitle = outcome === 'interested' 
          ? '🎉 Hot Lead! Call Successful' 
          : outcome === 'voicemail' 
            ? '📞 Voicemail Left'
            : '📞 Call Completed';

        const notificationMessage = outcome === 'interested'
          ? `${call.metadata?.facility_name || 'Lead'} showed interest! Recording available.`
          : outcome === 'voicemail'
            ? `Left voicemail for ${call.metadata?.facility_name || 'lead'}.`
            : `Call with ${call.metadata?.facility_name || 'lead'} completed. Duration: ${duration}s`;

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: call.metadata?.user_id || updatedRecord.user_id,
            job_id: updatedRecord.id, // Use call record ID as reference
            type: 'call_completed',
            title: notificationTitle,
            message: notificationMessage,
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${event} event`,
        call_id: callId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Retell webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
