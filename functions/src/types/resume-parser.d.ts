declare module 'resume-parser' {
  interface Education {
    degree?: string;
    institution?: string;
    year?: string;
  }

  interface Experience {
    role?: string;
    company?: string;
    start_date?: string;
    end_date?: string;
    responsibilities?: string[];
  }

  interface ResumeParserResult {
    name?: string;
    email?: string;
    phone?: string;
    education?: Education[];
    work_experience?: Experience[];
    skills?: string[];
    languages?: string[];
  }

  export class ResumeParser {
    static parseResumeFile(filePath: string, outputPath: string): Promise<ResumeParserResult>;
    static parseResumeUrl(url: string): Promise<ResumeParserResult>;
  }
}