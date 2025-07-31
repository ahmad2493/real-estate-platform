const Lease = require('../models/Lease');

// CREATE lease
exports.createLease = async (req, res) => {
  try {
    const lease = new Lease(req.body);
    await lease.save();
    res.status(201).json(lease);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET all leases
exports.getAllLeases = async (req, res) => {
  try {
    const leases = await Lease.find()
      .populate('property tenant landlord agent')
      .sort({ createdAt: -1 });
    res.status(200).json(leases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET single lease
exports.getLeaseById = async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id).populate('property tenant landlord agent');
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    res.status(200).json(lease);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE lease
exports.updateLease = async (req, res) => {
  try {
    const lease = await Lease.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    res.status(200).json(lease);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE lease
exports.deleteLease = async (req, res) => {
  try {
    const lease = await Lease.findByIdAndDelete(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    res.status(200).json({ message: 'Lease deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
