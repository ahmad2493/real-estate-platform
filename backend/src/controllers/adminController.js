const User = require('../models/User');
const Agent = require('../models/Agent');
const Property = require('../models/Property');

// USER MANAGEMENT

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: { users } });
  } catch {
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch {
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isVerified: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User suspended', data: { user } });
  } catch {
    res.status(500).json({ success: false, message: 'Error suspending user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'User deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
};

// AGENT MANAGEMENT

exports.getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find().populate('user', 'name email phone');

    // Transform the data to avoid the React object rendering error
    const transformedAgents = agents.map((agent) => ({
      _id: agent._id,
      name: agent.user?.name || 'N/A',
      email: agent.user?.email || 'N/A',
      phone: agent.user?.phone || 'N/A',
      licenseNumber: agent.licenseNumber,
      agency: agent.agency?.name || 'N/A', // Return just the name as string
      agencyDetails: agent.agency, // Keep full object for details modal
      specializations: agent.specializations || [],
      status: agent.status || 'Inactive',
      createdAt: agent.createdAt || agent.joinedAt,
      isVerified: agent.isVerified,
    }));

    res.json({ success: true, data: { agents: transformedAgents } });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ success: false, message: 'Error fetching agents' });
  }
};

exports.editAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const agent = await Agent.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email phone');
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    res.json({ success: true, data: { agent } });
  } catch {
    res.status(500).json({ success: false, message: 'Error updating agent' });
  }
};

exports.suspendAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await Agent.findByIdAndUpdate(id, { status: 'Suspended' }, { new: true });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    res.json({ success: true, message: 'Agent suspended', data: { agent } });
  } catch {
    res.status(500).json({ success: false, message: 'Error suspending agent' });
  }
};

exports.reactivateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await Agent.findByIdAndUpdate(id, { status: 'Active' }, { new: true });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    res.json({ success: true, message: 'Agent reactivated', data: { agent } });
  } catch {
    res.status(500).json({ success: false, message: 'Error reactivating agent' });
  }
};

exports.approveAgent = async (req, res) => {
  try {
    const { id: applicationId } = req.params;
    const { approved, rejectionReason } = req.body;

    // 1. CHECK ADMIN PERMISSION
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // 2. FIND AGENT APPLICATION
    const agentApplication = await Agent.findById(applicationId).populate(
      'user',
      'name email phone avatar'
    );

    if (!agentApplication) {
      return res.status(404).json({
        success: false,
        message: 'Agent application not found',
      });
    }

    // 3. CHECK APPLICATION STATUS
    if (agentApplication.status === 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Agent application already approved',
      });
    }

    if (approved === true) {
      // 4. APPROVE APPLICATION

      // Update user role to Agent and clear intendedRole
      const updatedUser = await User.findByIdAndUpdate(
        agentApplication.user._id,
        {
          role: 'Agent',
          intendedRole: null, // Clear intended role since they're now an actual agent
          updatedAt: new Date(),
        },
        {
          new: true,
          runValidators: true,
        }
      ).select('-password');

      if (!updatedUser) {
        throw new Error('Failed to update user role');
      }

      // Update agent status to Active
      agentApplication.status = 'Active';
      agentApplication.isVerified = true;
      agentApplication.lastActive = new Date();
      agentApplication.reviewedAt = new Date();
      agentApplication.reviewedBy = req.user.id;

      await agentApplication.save();

      console.log(
        `Admin ${req.user.id} approved agent application for user ${agentApplication.user._id}`
      );

      res.status(200).json({
        success: true,
        message: 'Agent application approved successfully',
        data: {
          user: updatedUser,
          agent: agentApplication,
        },
      });
    } else if (approved === false) {
      // 5. REJECT APPLICATION (but keep intendedRole for reference)

      agentApplication.status = 'Rejected';
      agentApplication.rejectionReason = rejectionReason || 'Application did not meet requirements';
      agentApplication.reviewedAt = new Date();
      agentApplication.reviewedBy = req.user.id;

      await agentApplication.save();

      console.log(
        `Admin ${req.user.id} rejected agent application for user ${agentApplication.user._id}`
      );

      res.status(200).json({
        success: true,
        message: 'Agent application rejected',
        data: {
          agent: agentApplication,
          rejectionReason: agentApplication.rejectionReason,
        },
      });
    } else {
      // 6. INVALID REQUEST
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Please specify approved: true or approved: false',
      });
    }
  } catch (error) {
    console.error('Approve agent application error:', error);

    res.status(500).json({
      success: false,
      message: 'Error processing agent application',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

// PROPERTY MANAGEMENT

exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find()
      .populate('owner', 'name email')
      .populate({ path: 'agent', populate: { path: 'user', select: 'name email' } });
    res.json({ success: true, data: { properties } });
  } catch {
    res.status(500).json({ success: false, message: 'Error fetching properties' });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    await Property.findByIdAndDelete(id);
    res.json({ success: true, message: 'Property deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Error deleting property' });
  }
};
