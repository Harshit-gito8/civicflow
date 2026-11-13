import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'civicflow_super_secret_jwt_key_2026_cse', {
    expiresIn: '7d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, wardNumber, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'CITIZEN',
      department: department || 'GENERAL',
      wardNumber: wardNumber || 1,
      phone: phone || '',
    });

    const token = generateToken(user._id);

    await AuditLog.create({
      action: 'USER_REGISTERED',
      performedBy: user._id,
      performerName: user.name,
      performerRole: user.role,
      entityType: 'USER',
      entityId: user._id.toString(),
      details: `New ${user.role} user account created: ${user.email}`,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        wardNumber: user.wardNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Demo account templates
const DEMO_ACCOUNTS = {
  'admin@civicflow.gov.in': {
    name: 'Er. Rajesh Verma',
    role: 'ADMIN',
    department: 'ROADS_BRIDGES',
    wardNumber: 1,
    phone: '+91 98111 22233',
  },
  'contractor@civicflow.gov.in': {
    name: 'Apex Infrastructure Works',
    role: 'CONTRACTOR',
    department: 'ROADS_BRIDGES',
    wardNumber: 3,
    phone: '+91 94444 55566',
  },
  'buildwell@civicflow.gov.in': {
    name: 'BuildWell Civil & Drainage Corp',
    role: 'CONTRACTOR',
    department: 'WATER_SEWERAGE',
    wardNumber: 2,
    phone: '+91 95555 66677',
  },
  'tricitygrid@civicflow.gov.in': {
    name: 'Tricity Electrics & Urban Grid',
    role: 'CONTRACTOR',
    department: 'ELECTRICAL_LIGHTING',
    wardNumber: 5,
    phone: '+91 96666 77788',
  },
  'auditor@civicflow.gov.in': {
    name: 'Pooja Iyer',
    role: 'AUDITOR',
    department: 'GENERAL',
    wardNumber: 1,
    phone: '+91 97777 88899',
  },
  'citizen@civicflow.gov.in': {
    name: 'Aarav Sharma',
    role: 'CITIZEN',
    department: 'GENERAL',
    wardNumber: 3,
    phone: '+91 98765 43210',
  },
};

// @route   POST /api/auth/demo-login
// @desc    Direct 1-click persona authorization for examiners & evaluations
router.post('/demo-login', async (req, res) => {
  try {
    const { role } = req.body;
    const roleEmails = {
      ADMIN: 'admin@civicflow.gov.in',
      CONTRACTOR: 'contractor@civicflow.gov.in',
      AUDITOR: 'auditor@civicflow.gov.in',
      CITIZEN: 'citizen@civicflow.gov.in',
    };

    const targetEmail = roleEmails[role] || 'citizen@civicflow.gov.in';
    let user = await User.findOne({ email: targetEmail });

    if (!user) {
      const template = DEMO_ACCOUNTS[targetEmail];
      if (template) {
        user = await User.create({
          ...template,
          email: targetEmail,
          password: 'password123',
        });
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: `Could not initialize demo role: ${role}` });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        wardNumber: user.wardNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    let user = await User.findOne({ email }).select('+password');
    if (!user) {
      // If user is accessing a demo account, auto-seed it on the fly
      if (DEMO_ACCOUNTS[email] && (password === 'password123' || !password)) {
        user = await User.create({
          ...DEMO_ACCOUNTS[email],
          email,
          password: 'password123',
        });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        wardNumber: user.wardNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently logged-in user profile
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      wardNumber: req.user.wardNumber,
      phone: req.user.phone,
    },
  });
});

// @route   GET /api/auth/contractors
// @desc    Get all registered municipal contractor firms
router.get('/contractors', async (req, res) => {
  try {
    const contractors = await User.find({ role: 'CONTRACTOR' }).select('name email phone department');
    res.json({
      success: true,
      count: contractors.length,
      contractors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/demo-users
// @desc    Get pre-configured demo account credentials for 1-click test evaluation
router.get('/demo-users', (req, res) => {
  res.json({
    success: true,
    demoAccounts: [
      {
        role: 'CITIZEN',
        label: 'Aarav Sharma (Resident Citizen)',
        email: 'citizen@civicflow.gov.in',
        password: 'password123',
        description: 'Report issues, view live city map, upvote community defects, track repairs.',
      },
      {
        role: 'ADMIN',
        label: 'Er. Rajesh Verma (Chief Municipal Engineer)',
        email: 'admin@civicflow.gov.in',
        password: 'password123',
        description: 'Triage spatial clusters, assign contractors, monitor SLA deadlines, sign off.',
      },
      {
        role: 'CONTRACTOR',
        label: 'Apex Infrastructure Ltd (Field Contractor)',
        email: 'contractor@civicflow.gov.in',
        password: 'password123',
        description: 'Mobile field portal, arrive on site, upload completion photo with GPS geofence check.',
      },
      {
        role: 'AUDITOR',
        label: 'Pooja Iyer (City Governance Auditor)',
        email: 'auditor@civicflow.gov.in',
        password: 'password123',
        description: 'Ward performance metrics, SLA compliance analytics, contractor fraud audit logs.',
      },
    ],
  });
});

export default router;
