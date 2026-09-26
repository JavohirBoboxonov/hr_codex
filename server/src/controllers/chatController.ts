import ChatMessage from '../models/ChatMessage';
import Application from '../models/Application';
import Job from '../models/Job';
import { chatMessageToResponse } from '../utils/transform';
import { createErrorResponse } from '../utils/errorMessages';

export const getMessages = async (req, res) => {
  try {
    const hrJobIds = await Job.find({ createdBy: req.user._id }).select('_id').lean();
    const ids = hrJobIds.map(j => j._id);
    const appIds = await Application.find({ job: { $in: ids } }).select('_id').lean();
    const applicationIds = appIds.map(a => a._id);

    const messages = await ChatMessage.find({
      application: { $in: applicationIds },
      ...(req.query.applicationId ? { application: req.query.applicationId } : {}),
    })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: messages.map(m => chatMessageToResponse({ ...m, application: m.application })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { text } = req.body;

    const hrJobIds = await Job.find({ createdBy: req.user._id }).select('_id').lean();
    const ids = hrJobIds.map(j => j._id);
    const app = await Application.findOne({
      _id: applicationId,
      job: { $in: ids },
    });
    if (!app) {
      return res.status(404).json(createErrorResponse(req, 'CHAT_APP_NOT_FOUND', 404));
    }

    if (!text || !text.trim()) {
      return res.status(400).json(createErrorResponse(req, 'CHAT_MESSAGE_REQUIRED', 400));
    }

    const message = await ChatMessage.create({
      application: app._id,
      text: text.trim(),
      senderName: req.user.fullName,
      senderRole: 'hr',
      isRead: false,
    });

    res.status(201).json({
      success: true,
      data: chatMessageToResponse(message),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
