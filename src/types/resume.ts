export interface ResumeData {
  name: string;
  title: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
  };
  summary: string;
  experience: {
    company: string;
    position: string;
    period: string;
    highlights: string[];
  }[];
  education: {
    school: string;
    degree: string;
    period: string;
  }[];
  skills: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agent?: string;
  isIntegrityWarning?: boolean;
}
