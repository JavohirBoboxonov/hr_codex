
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2,
  Video,
  Type as TextIcon,
  Zap,
  Clock,
  Calendar,
  Globe,
  Lock,
  Save,
  Languages,
  Target,
  GraduationCap,
  Briefcase,
  FileText,
  BarChart3,
  AlertCircle,
  HelpCircle,
  Hash,
  ArrowRight,
  Edit3,
  PlusCircle,
  ListTodo,
  ShoppingCart
} from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { Job, Question, InterviewType, InterviewMode, JobVisibility, Language, InterviewCategory, ExperienceLevel } from '../../types';
import { UI_STRINGS } from '../../translations';

interface CreateJobProps {
  onJobCreate: (job: Job) => void;
  initialData?: Job;
  language: Language;
  user?: { interviews?: number; freeJobsUsed?: number };
}

interface FormErrors {
  title?: string;
  description?: string;
  skills?: string;
}

const CreateJob: React.FC<CreateJobProps> = ({ onJobCreate, initialData, language, user }) => {
  const navigate = useNavigate();
  const strings = UI_STRINGS[language];
  const t = strings.hr;
  const interviews = user?.interviews || 0;
  const freeJobsUsed = user?.freeJobsUsed || 0;
  const FREE_JOBS_LIMIT = 3;
  const freeJobsRemaining = Math.max(0, FREE_JOBS_LIMIT - freeJobsUsed);
  const hasFreeJobs = freeJobsRemaining > 0;
  const needsInterviews = !hasFreeJobs && interviews < 1;
  const MONTHLY_PRICE = 50000;
  const PER_INTERVIEW_PRICE = 5000;
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualText, setManualText] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const t_val = strings.validation;
  const tf = strings.hr.createJobForm;
  const buyCreditsLabel = language === Language.RU
    ? 'Купить интервью'
    : language === Language.EN
      ? 'Buy Interviews'
      : 'Suhbatlar sotib olish';
  const pricingTitle = language === Language.RU
    ? 'Тарифы интервью'
    : language === Language.EN
      ? 'Interview tariffs'
      : 'Intervyu tariflari';
  const pricingSubtitle = language === Language.RU
    ? 'Каждый новый интервью-процесс использует 1 кредит.'
    : language === Language.EN
      ? 'Each new interview process uses 1 credit.'
      : 'Har bir yangi intervyu jarayoni 1 ta kredit ishlatadi.';
  const oneTimeLabel = language === Language.RU
    ? 'Разовый'
    : language === Language.EN
      ? 'One-time'
      : 'Bir martalik';
  const oneTimeDesc = language === Language.RU
    ? '1 кредит интервью'
    : language === Language.EN
      ? '1 interview credit'
      : '1 ta intervyu krediti';
  const monthlyLabel = language === Language.RU
    ? 'Месячный'
    : language === Language.EN
      ? 'Monthly'
      : 'Oylik';
  const monthlyDesc = language === Language.RU
    ? '10 кредитов интервью'
    : language === Language.EN
      ? '10 interview credits'
      : '10 ta intervyu krediti';
  const currencyLabel = language === Language.RU
    ? 'сум'
    : language === Language.EN
      ? 'UZS'
      : "so'm";

  // Job Form State
  const [title, setTitle] = useState(initialData?.title || '');
  const [department, setDepartment] = useState(initialData?.department || 'IT');
  const [role, setRole] = useState(initialData?.role || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [level, setLevel] = useState<ExperienceLevel>(initialData?.experienceLevel || 'Mid');
  const [skills, setSkills] = useState(initialData?.requiredSkills.join(', ') || '');
  const [numQuestions, setNumQuestions] = useState(6);
  const [type, setType] = useState<InterviewType>(initialData?.interviewType || InterviewType.VOICE);
  const [category, setCategory] = useState<InterviewCategory>(initialData?.interviewCategory || InterviewCategory.TECHNICAL);
  const [mode, setMode] = useState<InterviewMode>(initialData?.interviewMode || InterviewMode.INSTANT);
  const [visibility, setVisibility] = useState<JobVisibility>(initialData?.visibility || JobVisibility.PUBLIC);
  const [jobLanguage, setJobLanguage] = useState<Language>(initialData?.sourceLanguage || Language.RU);
  const [resumeRequired, setResumeRequired] = useState(initialData?.resumeRequired ?? true);
  const [recordingEnabled, setRecordingEnabled] = useState(initialData?.recordingEnabled ?? false);
  const [deadline, setDeadline] = useState(initialData?.deadline || '');

  // Questions state
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!title.trim()) errors.title = t_val.titleRequired;
    if (!description.trim()) errors.description = t_val.descRequired;
    if (!skills.trim()) errors.skills = t_val.skillsRequired;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateQuestions = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    try {
      const skillArray = skills.split(',').map(s => s.trim());
      const generated = await geminiService.generateQuestions(
        title, 
        skillArray, 
        type, 
        category, 
        level, 
        description, 
        jobLanguage
      );
      setQuestions(generated.slice(0, numQuestions));
      setStep(2);
    } catch (error: any) {
      console.error("Generation error:", error);
      const msg = error?.message || "";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        alert(language === Language.UZ 
          ? "AI xizmati limiti tugadi yoki vaqtincha band. Iltimos, birozdan so'ng qayta urinib ko'ring." 
          : "AI service quota exhausted or busy. Please try again in a few minutes.");
      } else {
        alert("Failed to generate questions: " + (msg || "Unknown error"));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddManualQuestion = () => {
    if (!manualText.trim()) return;
    const newQ: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: manualText,
      category: 'Technical',
      answerType: type,
      difficulty: level
    };
    setQuestions([newQ, ...questions]);
    setManualText('');
    setIsAddingManual(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    if (needsInterviews) {
      alert(t.creditsRequiredDesc || 'Bepul ishlar tugadi. Ish yaratish uchun suhbatlar yetarli emas. Iltimos, suhbatlar sotib oling.');
      navigate('/buy-credits');
      return;
    }

    const shareToken = initialData?.shareToken || Math.random().toString(36).substr(2, 12);
    const inviteCode = initialData?.inviteCode || 'INV-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const newJob: Job = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      title,
      department,
      role: role || title,
      description,
      experienceLevel: level,
      requiredSkills: skills.split(',').map(s => s.trim()),
      interviewType: type,
      interviewCategory: category,
      interviewMode: mode,
      visibility,
      sourceLanguage: jobLanguage,
      resumeRequired,
      recordingEnabled,
      questions,
      deadline: mode === InterviewMode.ASYNC ? deadline : undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      status: initialData?.status || 'Active',
      shareToken,
      inviteCode
    };
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await onJobCreate(newJob);
      navigate('/hr-jobs');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const HelperText = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed flex items-center gap-1 mt-1">
      <HelpCircle size={10} className="shrink-0" />
      {children}
    </p>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 transition-all">
      {/* Free Tier Info */}
      {hasFreeJobs && (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-400 dark:border-emerald-800 rounded-2xl">
          <div className="flex items-center gap-4">
            <Zap className="text-emerald-600 dark:text-emerald-400" size={24} />
            <div>
              <p className="font-black text-emerald-900 dark:text-emerald-100">
                {t.freeTierTitle || 'Bepul reja'}
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                {t.freeJobsRemaining || 'Bepul ishlar qoldi'}: {freeJobsRemaining} / {FREE_JOBS_LIMIT}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Credits Warning */}
      {needsInterviews && (
        <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={24} />
            <div>
              <p className="font-black text-yellow-900 dark:text-yellow-100">
                {t.creditsRequired || 'Suhbatlar talab qilinadi'}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {t.creditsRequiredDesc || `Bepul ishlar tugadi. Ish yaratish uchun kamida 1 ta suhbat kerak. Sizda ${interviews} ta suhbat bor. 1 suhbat narxi: ${PER_INTERVIEW_PRICE.toLocaleString()} so'm.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/buy-credits')}
            className="px-6 py-3 bg-yellow-600 text-white rounded-xl font-black hover:bg-yellow-700 transition-all flex items-center gap-2"
          >
            <ShoppingCart size={20} />
            {buyCreditsLabel}
          </button>
        </div>
      )}

      <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-black text-indigo-900 dark:text-indigo-100 text-lg">{pricingTitle}</p>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
              {pricingSubtitle}
            </p>
          </div>
          <button
            onClick={() => navigate('/buy-credits')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <ShoppingCart size={18} />
            {buyCreditsLabel}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{oneTimeLabel}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{PER_INTERVIEW_PRICE.toLocaleString()} {currencyLabel}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{oneTimeDesc}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{monthlyLabel}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{MONTHLY_PRICE.toLocaleString()} {currencyLabel}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{monthlyDesc}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{tf.title}</h2>
          <p className="text-slate-500">{tf.step} {step} {tf.of} 2: {step === 1 ? tf.details : tf.design}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {Object.keys(formErrors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="text-red-500" size={20} />
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{t_val.summaryError}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{tf.jobTitleLabel}</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (formErrors.title) setFormErrors(prev => ({ ...prev, title: undefined }));
                  }}
                  className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none ring-1 transition-all dark:text-white ${
                    formErrors.title ? 'ring-red-500 focus:ring-red-500' : 'ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-600'
                  }`}
                  placeholder="e.g. Senior Product Designer"
                />
                {formErrors.title && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">{formErrors.title}</p>}
                <HelperText>{tf.jobTitleHelper}</HelperText>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{tf.experienceLabel}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                   {['Junior', 'Mid', 'Senior', 'Lead'].map((l) => (
                     <button 
                      key={l}
                      onClick={() => setLevel(l as ExperienceLevel)}
                      className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${
                        level === l ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                      }`}
                     >
                       {l}
                     </button>
                   ))}
                </div>
                <HelperText>{tf.experienceHelper}</HelperText>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{tf.jobDescLabel}</label>
              <textarea 
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (formErrors.description) setFormErrors(prev => ({ ...prev, description: undefined }));
                }}
                rows={4}
                className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none ring-1 transition-all dark:text-white ${
                  formErrors.description ? 'ring-red-500 focus:ring-red-500' : 'ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-600'
                }`}
                placeholder="Responsibilities, team culture, daily tasks..."
              />
              {formErrors.description && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">{formErrors.description}</p>}
              <HelperText>{tf.jobDescHelper}</HelperText>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{tf.skillsLabel}</label>
                <input 
                  type="text" 
                  value={skills}
                  onChange={(e) => {
                    setSkills(e.target.value);
                    if (formErrors.skills) setFormErrors(prev => ({ ...prev, skills: undefined }));
                  }}
                  className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none ring-1 transition-all dark:text-white ${
                    formErrors.skills ? 'ring-red-500 focus:ring-red-500' : 'ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-600'
                  }`}
                  placeholder="React, AWS, Node.js, Design Thinking"
                />
                {formErrors.skills && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">{formErrors.skills}</p>}
                <HelperText>{tf.skillsHelper}</HelperText>
              </div>

              <div className="space-y-1.5">
                 <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{tf.numQuestionsLabel}</label>
                 <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700">
                    <Hash size={16} className="text-slate-400" />
                    <input 
                      type="range" min="3" max="15" step="1"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="font-black text-indigo-600 w-8 text-center">{numQuestions}</span>
                 </div>
                 <HelperText>{tf.numQuestionsHelper}</HelperText>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Target size={16} className="text-indigo-600" /> {tf.focusLabel}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { 
                    id: InterviewCategory.TECHNICAL, 
                    title: tf.directions.technical.title, 
                    desc: tf.directions.technical.desc 
                  },
                  { 
                    id: InterviewCategory.CAREER, 
                    title: tf.directions.behavioral.title, 
                    desc: tf.directions.behavioral.desc 
                  },
                  { 
                    id: InterviewCategory.ACADEMIC, 
                    title: tf.directions.hr.title, 
                    desc: tf.directions.hr.desc 
                  }
                ].map((dir) => (
                  <button 
                    key={dir.id}
                    onClick={() => setCategory(dir.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 group ${
                      category === dir.id 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <span className={`font-black text-sm transition-colors ${category === dir.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                      {dir.title}
                    </span>
                    <span className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                      {dir.desc}
                    </span>
                  </button>
                ))}
              </div>
              <HelperText>{tf.directionHelper}</HelperText>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
               <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Languages size={16} /> {tf.langLabel}
                </label>
                <select 
                  value={jobLanguage}
                  onChange={(e) => setJobLanguage(e.target.value as Language)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-600 transition-all dark:text-white"
                >
                <option value={Language.RU}>{tf.langNames.ru}</option>
                <option value={Language.EN}>{tf.langNames.en}</option>
                <option value={Language.UZ}>{tf.langNames.uz}</option>
              </select>
              <HelperText>{tf.langHelper}</HelperText>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Video size={16} className="text-indigo-600" /> {tf.recordingLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setRecordingEnabled(v => !v)}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl ring-1 transition-all text-left ${
                    recordingEnabled
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-indigo-400 dark:ring-indigo-700'
                      : 'bg-slate-50 dark:bg-slate-800 ring-slate-200 dark:ring-slate-700'
                  }`}
                >
                  <div className={`w-10 h-6 rounded-full flex items-center transition-colors shrink-0 ${recordingEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${recordingEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className={`text-sm font-semibold ${recordingEnabled ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {recordingEnabled ? (language === Language.RU ? 'Включено' : language === Language.EN ? 'Enabled' : 'Yoqilgan') : (language === Language.RU ? 'Выключено' : language === Language.EN ? 'Disabled' : 'O\'chirilgan')}
                  </span>
                </button>
                <HelperText>{tf.recordingDesc}</HelperText>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-end gap-3">
              <div className="text-right">
                <button 
                  onClick={handleGenerateQuestions}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-2xl shadow-indigo-200 dark:shadow-none active:scale-95 group"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      {tf.analyzing}
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} />
                      {tf.generateBtn}
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <div className="mt-3">
                   <HelperText>{tf.generateHelper}</HelperText>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-lg">
            <div>
              <h3 className="text-xl font-black">{tf.reviewTitle}</h3>
              <p className="text-indigo-100 italic text-sm">{tf.reviewSub} ({level} / {jobLanguage.toUpperCase()})</p>
            </div>
            <button onClick={() => setStep(1)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase transition-all">
              {strings.common.back}
            </button>
          </div>

          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <ListTodo size={20} className="text-indigo-600" />
              {tf.questionListTitle}
            </h3>
            <button 
              onClick={() => setIsAddingManual(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
            >
              <PlusCircle size={14} />
              {tf.addQuestionBtn}
            </button>
          </div>

          {isAddingManual && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border-2 border-indigo-200 dark:border-indigo-900/50 animate-in zoom-in-95">
              <textarea 
                autoFocus
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={tf.newQuestionPlaceholder}
                className="w-full bg-transparent text-slate-800 dark:text-white font-medium resize-none border-none focus:ring-0 p-0 text-sm mb-4"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsAddingManual(false)} className="px-5 py-2 text-slate-500 font-bold text-xs">{strings.common.cancel}</button>
                <button 
                  onClick={handleAddManualQuestion}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  {tf.saveQuestionBtn}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {questions.length === 0 && !isAddingManual && (
               <div className="py-20 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem]">
                  No questions in the session. Add some manually or go back to generate.
               </div>
            )}
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                        {q.category}
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-400">Q{index + 1}</span>
                    </div>
                    <textarea 
                      value={q.text}
                      onChange={(e) => {
                        const newQs = [...questions];
                        newQs[index].text = e.target.value;
                        setQuestions(newQs);
                      }}
                      className="w-full bg-transparent text-slate-800 dark:text-white font-medium resize-none border-none focus:ring-0 p-0 text-sm focus:bg-slate-50 dark:focus:bg-slate-800 rounded px-1 transition-colors"
                      rows={2}
                    />
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleRemoveQuestion(q.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-end gap-3">
             {submitError && (
               <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold">
                 {submitError}
               </div>
             )}
             <div className="text-right">
              <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-3 px-12 py-6 bg-slate-900 dark:bg-indigo-600 text-white rounded-[2rem] font-black text-2xl hover:scale-105 transition-all shadow-[0_20px_50px_rgba(79,70,229,0.3)] group disabled:opacity-70">
                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : null}
                {tf.saveBtn}
                <CheckCircle2 size={32} className="text-indigo-400 dark:text-white" />
              </button>
              <div className="mt-3">
                 <HelperText>{tf.saveHelper}</HelperText>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateJob;
