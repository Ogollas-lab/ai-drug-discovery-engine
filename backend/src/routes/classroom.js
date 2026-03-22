const express = require('express');
const router = express.Router();
const ClassroomSession = require('../models/ClassroomSession');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/classroom/sessions
 * Create a new classroom session
 */
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { name, date, scenario, scenarioId, joinCode } = req.body;

    if (!name || !date || !scenario || !scenarioId || !joinCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = new ClassroomSession({
      userId: req.user.id,
      name,
      date,
      scenario,
      scenarioId,
      joinCode,
      status: 'draft',
      studentWork: [],
      chat: [],
      students: 0
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating classroom session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/classroom/sessions
 * Get all classroom sessions for the authenticated user
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await ClassroomSession.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching classroom sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/classroom/sessions/:sessionId
 * Get a specific classroom session
 */
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await ClassroomSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching classroom session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

/**
 * PATCH /api/classroom/sessions/:sessionId
 * Update a classroom session (status, submissions, chat, etc.)
 */
router.patch('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await ClassroomSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Allow updating specific fields
    const { name, status, studentWork, chat, students } = req.body;

    if (name) session.name = name;
    if (status) session.status = status;
    if (studentWork !== undefined) session.studentWork = studentWork;
    if (chat !== undefined) session.chat = chat;
    if (students !== undefined) session.students = students;

    await session.save();
    res.json(session);
  } catch (error) {
    console.error('Error updating classroom session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

/**
 * POST /api/classroom/sessions/:sessionId/submissions
 * Add a student submission to a session
 */
router.post('/sessions/:sessionId/submissions', authenticateToken, async (req, res) => {
  try {
    const session = await ClassroomSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const submission = req.body;

    if (!submission.id || !submission.name || !submission.smiles) {
      return res.status(400).json({ error: 'Missing required submission fields' });
    }

    session.studentWork.push(submission);
    
    // Update student count if new student
    const uniqueStudents = new Set(session.studentWork.map(w => w.name)).size;
    session.students = Math.max(session.students, uniqueStudents);

    await session.save();
    res.json(session);
  } catch (error) {
    console.error('Error adding submission:', error);
    res.status(500).json({ error: 'Failed to add submission' });
  }
});

/**
 * POST /api/classroom/sessions/:sessionId/chat
 * Add a chat message to a session
 */
router.post('/sessions/:sessionId/chat', authenticateToken, async (req, res) => {
  try {
    const session = await ClassroomSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const message = req.body;

    if (!message.id || !message.author || !message.text) {
      return res.status(400).json({ error: 'Missing required message fields' });
    }

    session.chat.push(message);
    await session.save();
    res.json(session);
  } catch (error) {
    console.error('Error adding chat message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * DELETE /api/classroom/sessions/:sessionId
 * Delete a classroom session
 */
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await ClassroomSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await ClassroomSession.findByIdAndDelete(req.params.sessionId);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting classroom session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;
