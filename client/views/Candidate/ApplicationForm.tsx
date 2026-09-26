
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Upload,
  Globe,
  Sparkles,
  X,
  FileUp,
  File,
  Sun,
  Moon
} from 'lucide-react';
import { Job, CandidateApplication, Language, User } from '../../types';
import * as publicService from '../../services/publicService';
import { UI_STRINGS } from '../../translations';

interface ApplicationFormProps {
  user: User | null;
  jobs: Job[];
  onApply: (application: CandidateApplication) => void;
  language: Language;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({ user, jobs, onApply, language, theme, toggleTheme }) => {
  const { jobId } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || undefined;
  const navigate = useNavigate();
  const jobFromProps = jobs.find(j => j.id === jobId);
  const [jobFromApi, setJobFromApi] = useState<Job | null | undefined>(undefined);
  const job = jobFromProps ?? (jobFromApi === undefined ? null : jobFromApi);

  useEffect(() => {
    if (jobId && !jobFromProps) {
      publicService.getJobById(jobId, code).then(setJobFromApi).catch(() => setJobFromApi(null));
    } else if (jobFromProps) {
      setJobFromApi(undefined);
    }
  }, [jobId, code, jobFromProps]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<CandidateApplication | null>(null);

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (jobId && !jobFromProps && jobFromApi === undefined) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" size={48} /></div>;
  if (!job) return <div className="p-20 text-center font-bold text-slate-400 bg-slate-950 min-h-screen">Job position not found.</div>;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert("File size should be less than 5MB");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setFileBase64(base64String);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !fileBase64 || !file) {
      alert("Please upload your resume");
      return;
    }
    setIsSubmitting(true);

    try {
      const application = await publicService.applyToJob(
        jobId,
        {
          name,
          email,
          phone: phone || undefined,
          experienceYears: experience,
          resumeFileName: file.name,
          resumeMimeType: file.type,
          resumeBase64: fileBase64,
        },
        code
      );

      onApply(application);
      setCurrentApplication(application);
    } catch (error: any) {
      console.error(error);
      // Agar error 401 (auth xatosi) bo'lsa, requestAuth o'zi login ga yo'naltiradi, shuning uchun alert ko'rsatmaymiz
      if (error.status === 401 || error.message === "Kirish uchun avtorizatsiya talab qilinadi" || error.message === "Token muddati tugagan" || error.message === "Not authenticated") {
         return;
      }
      alert(error instanceof Error ? error.message : "Application submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentApplication) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center relative">
        <button 
          onClick={toggleTheme}
          className="absolute top-8 right-8 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all active:scale-95 z-50"
        >
          {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>

        <div className="max-w-md w-full animate-in zoom-in-95 duration-500">
          <div className="w-28 h-28 bg-emerald-500/20 rounded-[2.5rem] mx-auto flex items-center justify-center mb-10 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <CheckCircle2 size={56} className="text-emerald-500" />
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tight leading-tight">Pre-Screening <br/>Successful</h2>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">
            AI has analyzed your resume for the <b>{job.title}</b> position. You have been qualified for the next stage.
          </p>
          
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 mb-10 text-left space-y-4">
             <div className="flex items-center gap-3">
               <Sparkles size={20} className="text-indigo-400" />
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Summary Verdict</p>
             </div>
             <p className="text-sm text-slate-300 leading-relaxed italic">"{currentApplication.analysis?.summary}"</p>
          </div>

          <button 
            onClick={() => navigate(`/i/${job.shareToken}?appId=${currentApplication.id}`)} 
            className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 rounded-3xl font-black text-xl transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-3 group"
          >
            Start AI Interview Room 
            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto relative transition-colors duration-500">
      <button 
        onClick={toggleTheme}
        className="absolute top-8 right-8 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all active:scale-95 z-50"
      >
        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
      </button>

      <div className="max-w-2xl w-full space-y-12 py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-widest shadow-xl">
            <Globe size={14} /> Global Recruitment Channel
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter leading-none">Apply for <br/><span className="text-indigo-500">{job.title}</span></h1>
          <p className="text-slate-500 text-xl font-medium">{job.department} • {job.role}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/50 p-10 sm:p-14 rounded-[4rem] border border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.3)] space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-slate-800/80 border border-slate-700 rounded-3xl text-white outline-none focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-bold"
                  placeholder="Jane Doe"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-slate-800/80 border border-slate-700 rounded-3xl text-white outline-none focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-bold"
                  placeholder="jane@example.com"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input 
                  type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-slate-800/80 border border-slate-700 rounded-3xl text-white outline-none focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-bold"
                  placeholder="+1 234 567 890"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Years of Experience</label>
              <div className="relative">
                <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input 
                  type="number" required value={experience} onChange={e => setExperience(parseInt(e.target.value))}
                  className="w-full pl-14 pr-6 py-5 bg-slate-800/80 border border-slate-700 rounded-3xl text-white outline-none focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-bold"
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Upload Resume (PDF/DOCX)</label>
            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center w-full py-16 bg-slate-800/40 border-2 border-dashed border-slate-700 rounded-[3rem] cursor-pointer hover:bg-slate-800/60 hover:border-indigo-500 transition-all"
              >
                <div className="p-5 bg-slate-700/50 rounded-[1.5rem] mb-6 group-hover:scale-110 group-hover:bg-indigo-600/20 transition-all">
                  <FileUp className="text-slate-400 group-hover:text-indigo-400" size={40} />
                </div>
                <p className="text-lg font-bold text-slate-300">Drag and drop or click to upload</p>
                <p className="text-sm text-slate-500 mt-2">Maximum file size: 5MB (PDF, DOCX)</p>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".pdf,.doc,.docx" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-6 bg-indigo-600/10 border border-indigo-600/30 rounded-3xl animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600/20 rounded-xl">
                    <File className="text-indigo-400" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-200 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready for AI screening</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setFile(null); setFileBase64(null); }}
                  className="p-3 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          <button 
            type="submit" disabled={isSubmitting || !file}
            className="w-full py-8 bg-indigo-600 rounded-[2rem] font-black text-2xl hover:bg-indigo-700 transition-all shadow-[0_20px_50px_rgba(79,70,229,0.3)] active:scale-95 flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={32} className="animate-spin" />
                AI SCANNING RESUME...
              </>
            ) : (
              <>
                <Upload size={28} className="group-hover:-translate-y-1 transition-transform" />
                SUBMIT APPLICATION
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;
