"""
Autonomous Call Trigger System
Manages AI-powered calls to healthcare facilities
"""

import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CallStatus(Enum):
    """Call status enumeration"""
    PENDING = "pending"
    INITIATED = "initiated"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"
    VOICEMAIL = "voicemail"
    DECLINED = "declined"


class CallRecord:
    """Represents a single call record"""
    
    def __init__(self, facility_name: str, phone_number: str, analysis: Dict):
        self.id = self._generate_call_id()
        self.facility_name = facility_name
        self.phone_number = phone_number
        self.analysis = analysis
        self.status = CallStatus.PENDING
        self.created_at = datetime.now().isoformat()
        self.started_at = None
        self.ended_at = None
        self.duration = None
        self.call_transcript = None
        self.call_recording_url = None
        self.outcome = None
        self.notes = None
        self.ai_agent_script = None

    def _generate_call_id(self) -> str:
        """Generate unique call ID"""
        import uuid
        return f"call_{uuid.uuid4().hex[:12]}"

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'facility_name': self.facility_name,
            'phone_number': self.phone_number,
            'status': self.status.value,
            'created_at': self.created_at,
            'started_at': self.started_at,
            'ended_at': self.ended_at,
            'duration': self.duration,
            'call_transcript': self.call_transcript,
            'call_recording_url': self.call_recording_url,
            'outcome': self.outcome,
            'notes': self.notes,
            'ai_agent_script': self.ai_agent_script,
        }


class AutonomousCallManager:
    """Manages autonomous calls to healthcare facilities"""

    def __init__(self, twilio_account_sid: Optional[str] = None, 
                 twilio_auth_token: Optional[str] = None,
                 twilio_phone_number: Optional[str] = None):
        """
        Initialize call manager with Twilio credentials
        
        Args:
            twilio_account_sid: Twilio account SID
            twilio_auth_token: Twilio auth token
            twilio_phone_number: Twilio phone number to call from
        """
        self.twilio_account_sid = twilio_account_sid or os.getenv('TWILIO_ACCOUNT_SID')
        self.twilio_auth_token = twilio_auth_token or os.getenv('TWILIO_AUTH_TOKEN')
        self.twilio_phone_number = twilio_phone_number or os.getenv('TWILIO_PHONE_NUMBER')
        
        # Initialize Twilio client if credentials available
        if self.twilio_account_sid and self.twilio_auth_token:
            try:
                from twilio.rest import Client
                self.twilio_client = Client(self.twilio_account_sid, self.twilio_auth_token)
                logger.info("Twilio client initialized successfully")
            except ImportError:
                logger.warning("Twilio library not installed. Install with: pip install twilio")
                self.twilio_client = None
        else:
            logger.warning("Twilio credentials not provided. Call functionality will be simulated.")
            self.twilio_client = None
        
        self.call_history = []
        self.do_not_call_list = self._load_do_not_call_list()

    def _load_do_not_call_list(self) -> set:
        """Load TCPA Do Not Call list (simplified)"""
        # In production, integrate with actual DNC registry
        return set()

    def is_compliant_to_call(self, phone_number: str) -> Dict:
        """
        Check if a phone number is compliant to call (TCPA compliance)
        
        Args:
            phone_number: Phone number to check
            
        Returns:
            Dictionary with compliance status and reasons
        """
        compliance = {
            'can_call': True,
            'reasons': [],
            'checks': {}
        }
        
        # Check Do Not Call list
        if phone_number in self.do_not_call_list:
            compliance['can_call'] = False
            compliance['reasons'].append("Number is on Do Not Call list")
            compliance['checks']['dnc_check'] = False
        else:
            compliance['checks']['dnc_check'] = True
        
        # Check phone number format
        if not self._is_valid_phone(phone_number):
            compliance['can_call'] = False
            compliance['reasons'].append("Invalid phone number format")
            compliance['checks']['format_check'] = False
        else:
            compliance['checks']['format_check'] = True
        
        # Check time of day (business hours only)
        from datetime import datetime
        current_hour = datetime.now().hour
        if current_hour < 8 or current_hour > 20:
            compliance['can_call'] = False
            compliance['reasons'].append("Outside business hours")
            compliance['checks']['hours_check'] = False
        else:
            compliance['checks']['hours_check'] = True
        
        return compliance

    def _is_valid_phone(self, phone_number: str) -> bool:
        """Validate phone number format"""
        import re
        pattern = r'^\+?1?\s*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$'
        return bool(re.match(pattern, phone_number))

    def trigger_call(self, facility_name: str, phone_number: str, 
                    analysis: Dict, call_script: str) -> Dict:
        """
        Trigger an autonomous call to a healthcare facility
        
        Args:
            facility_name: Name of the facility
            phone_number: Phone number to call
            analysis: Facility analysis data
            call_script: AI-generated call script
            
        Returns:
            Dictionary with call initiation status
        """
        
        # Check compliance
        compliance = self.is_compliant_to_call(phone_number)
        
        if not compliance['can_call']:
            logger.warning(f"Cannot call {facility_name}: {', '.join(compliance['reasons'])}")
            return {
                'success': False,
                'call_id': None,
                'error': 'Call not compliant with regulations',
                'compliance_issues': compliance['reasons']
            }
        
        # Create call record
        call_record = CallRecord(facility_name, phone_number, analysis)
        call_record.ai_agent_script = call_script
        
        # Attempt to initiate call
        try:
            if self.twilio_client:
                # Real Twilio call
                result = self._initiate_twilio_call(call_record)
            else:
                # Simulated call for testing
                result = self._simulate_call(call_record)
            
            # Store call record
            self.call_history.append(call_record)
            
            logger.info(f"Call initiated to {facility_name}: {call_record.id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to initiate call: {str(e)}")
            return {
                'success': False,
                'call_id': call_record.id,
                'error': str(e)
            }

    def _initiate_twilio_call(self, call_record: CallRecord) -> Dict:
        """Initiate a real Twilio call"""
        
        try:
            # Create TwiML for the call
            twiml = self._generate_twiml(call_record)
            
            # Make the call
            call = self.twilio_client.calls.create(
                to=call_record.phone_number,
                from_=self.twilio_phone_number,
                twiml=twiml,
                record=True,  # Record the call
                recording_channels='mono',
                recording_status_callback='https://your-domain.com/recording-status'
            )
            
            call_record.status = CallStatus.INITIATED
            call_record.started_at = datetime.now().isoformat()
            
            return {
                'success': True,
                'call_id': call_record.id,
                'twilio_call_sid': call.sid,
                'status': call_record.status.value,
                'facility_name': call_record.facility_name,
                'phone_number': call_record.phone_number,
            }
            
        except Exception as e:
            logger.error(f"Twilio call failed: {str(e)}")
            raise

    def _simulate_call(self, call_record: CallRecord) -> Dict:
        """Simulate a call for testing (when Twilio not available)"""
        
        import random
        
        call_record.status = CallStatus.INITIATED
        call_record.started_at = datetime.now().isoformat()
        
        # Simulate call outcomes
        outcomes = [
            {'status': CallStatus.COMPLETED, 'outcome': 'interested', 'duration': 180},
            {'status': CallStatus.COMPLETED, 'outcome': 'not_interested', 'duration': 45},
            {'status': CallStatus.NO_ANSWER, 'outcome': 'no_answer', 'duration': 0},
            {'status': CallStatus.VOICEMAIL, 'outcome': 'voicemail', 'duration': 30},
        ]
        
        outcome = random.choice(outcomes)
        call_record.status = outcome['status']
        call_record.duration = outcome['duration']
        call_record.outcome = outcome['outcome']
        call_record.ended_at = datetime.now().isoformat()
        
        # Simulate transcript
        if call_record.status == CallStatus.COMPLETED:
            call_record.call_transcript = self._generate_sample_transcript(call_record)
        
        return {
            'success': True,
            'call_id': call_record.id,
            'status': call_record.status.value,
            'outcome': call_record.outcome,
            'facility_name': call_record.facility_name,
            'phone_number': call_record.phone_number,
            'duration': call_record.duration,
            'note': 'Simulated call (Twilio not configured)'
        }

    def _generate_twiml(self, call_record: CallRecord) -> str:
        """Generate TwiML for the call"""
        
        # This would use a text-to-speech service to read the script
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="alice">Hello, this is an automated call from ScrapeX. 
            {call_record.ai_agent_script}
            </Say>
            <Gather numDigits="1" action="/call-response">
                <Say>Press 1 to speak with someone, or hang up to end the call.</Say>
            </Gather>
        </Response>"""
        
        return twiml

    def _generate_sample_transcript(self, call_record: CallRecord) -> str:
        """Generate a sample call transcript"""
        
        return f"""
CALLER: Hello, this is an automated call from ScrapeX regarding {call_record.facility_name}.

CALLER: {call_record.ai_agent_script}

RECIPIENT: [Response recorded]

CALLER: Thank you for your time. Have a great day!
"""

    def get_call_history(self, facility_name: Optional[str] = None) -> List[Dict]:
        """Get call history"""
        
        history = []
        for call in self.call_history:
            if facility_name is None or call.facility_name == facility_name:
                history.append(call.to_dict())
        
        return history

    def get_call_statistics(self) -> Dict:
        """Get call statistics"""
        
        if not self.call_history:
            return {
                'total_calls': 0,
                'completed_calls': 0,
                'failed_calls': 0,
                'success_rate': 0,
                'average_duration': 0,
                'by_status': {}
            }
        
        total = len(self.call_history)
        completed = sum(1 for c in self.call_history if c.status == CallStatus.COMPLETED)
        failed = sum(1 for c in self.call_history if c.status == CallStatus.FAILED)
        
        durations = [c.duration for c in self.call_history if c.duration]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        status_counts = {}
        for call in self.call_history:
            status = call.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            'total_calls': total,
            'completed_calls': completed,
            'failed_calls': failed,
            'success_rate': (completed / total * 100) if total > 0 else 0,
            'average_duration': avg_duration,
            'by_status': status_counts
        }


# Example usage
if __name__ == "__main__":
    caller = AutonomousCallManager()
    
    # Example call
    facility_analysis = {
        'facility_name': 'Community Health Clinic',
        'lead_score': 85
    }
    
    call_script = "Hi, I'm calling about your healthcare facility. We help clinics improve patient scheduling efficiency."
    
    result = caller.trigger_call(
        facility_name='Community Health Clinic',
        phone_number='(555) 123-4567',
        analysis=facility_analysis,
        call_script=call_script
    )
    
    print(json.dumps(result, indent=2))
    
    # Get statistics
    stats = caller.get_call_statistics()
    print("\nCall Statistics:")
    print(json.dumps(stats, indent=2))
