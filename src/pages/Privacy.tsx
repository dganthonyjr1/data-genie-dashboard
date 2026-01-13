import { useEffect, useState } from "react";

const Privacy = () => {
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch("/PRIVACY_POLICY.md")
      .then((response) => response.text())
      .then((text) => setContent(text))
      .catch((error) => console.error("Error loading privacy policy:", error));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-slate max-w-none">
        <pre className="whitespace-pre-wrap font-sans">{content}</pre>
      </div>
    </div>
  );
};

export default Privacy;
