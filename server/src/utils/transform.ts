function jobToResponse(doc) {
  if (!doc) return null;
  const j = doc.toObject ? doc.toObject() : doc;
  return {
    id: j._id?.toString(),
    title: j.title,
    department: j.department,
    role: j.role,
    description: j.description,
    experienceLevel: j.experienceLevel,
    requiredSkills: j.requiredSkills || [],
    interviewType: j.interviewType,
    interviewCategory: j.interviewCategory,
    interviewMode: j.interviewMode,
    visibility: j.visibility,
    sourceLanguage: j.sourceLanguage,
    resumeRequired: j.resumeRequired,
    recordingEnabled: j.recordingEnabled ?? false,
    questions: j.questions || [],
    deadline: j.deadline?.toISOString?.() || j.deadline,
    startTime: j.startTime?.toISOString?.() || j.startTime,
    endTime: j.endTime?.toISOString?.() || j.endTime,
    createdAt: j.createdAt?.toISOString?.() || j.createdAt,
    status: j.status,
    shareToken: j.shareToken,
    inviteCode: j.inviteCode,
  };
}

function applicationToResponse(doc) {
  if (!doc) return null;
  const a = doc.toObject ? doc.toObject() : doc;
  return {
    id: a._id?.toString(),
    jobId: a.job?._id?.toString?.() || a.job?.toString?.() || a.job,
    name: a.name,
    email: a.email,
    phone: a.phone || '',
    experienceYears: a.experienceYears || 0,
    resumeFileName: a.resumeFileName || '',
    resumeMimeType: a.resumeMimeType || '',
    resumeBase64: a.resumeBase64 || '',
    analysis: a.analysis,
    status: a.status,
    appliedAt: a.createdAt?.toISOString?.() || a.appliedAt,
  };
}

function sessionToResponse(doc) {
  if (!doc) return null;
  const s = doc.toObject ? doc.toObject() : doc;
  const application = s.application;
  const candidateName = (application && typeof application === 'object' && application.name)
    ? application.name
    : (s.candidateName && String(s.candidateName).trim()) || s.candidateId;
  return {
    id: s._id?.toString(),
    jobId: s.job?._id?.toString?.() || s.job?.toString?.() || s.job,
    applicationId: s.application?._id?.toString?.() || s.application?.toString?.() || s.application,
    candidateId: s.candidateId,
    candidateName,
    status: s.status,
    answers: s.answers || [],
    evaluation: s.evaluation,
    startedAt: s.createdAt?.toISOString?.() || s.startedAt,
    completedAt: s.completedAt?.toISOString?.() || s.completedAt,
    language: s.language,
    hasRecording: !!(s.recordingKey || s.recordingPath),
    candidateFeedback: s.candidateFeedback,
    hrFeedback: s.hrFeedback,
  };
}

function chatMessageToResponse(doc) {
  if (!doc) return null;
  const m = doc.toObject ? doc.toObject() : doc;
  return {
    id: m._id?.toString(),
    applicationId: m.application?.toString?.() || m.application,
    text: m.text,
    senderName: m.senderName,
    timestamp: m.createdAt?.toISOString?.() || m.timestamp,
    isRead: m.isRead,
  };
}

export {
  jobToResponse,
  applicationToResponse,
  sessionToResponse,
  chatMessageToResponse,
};
