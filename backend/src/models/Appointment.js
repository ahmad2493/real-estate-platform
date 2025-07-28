const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
  },
  // Basic appointment details
  scheduledDate: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    default: 60, // minutes
  },
  type: {
    type: String,
    enum: ['Property Viewing', 'Virtual Tour', 'Consultation', 'Document Signing', 'Other'],
    default: 'Property Viewing',
  },
  // Basic meeting details
  meetingMode: {
    type: String,
    enum: ['In-Person', 'Virtual', 'Phone'],
    default: 'In-Person',
  },
  location: {
    address: String, // For in-person meetings
    meetingLink: String, // For virtual meetings
    instructions: String,
  },
  // Basic notes
  notes: {
    agentNotes: String,
    clientRequests: String,
  },
  // Status
  status: {
    type: String,
    enum: ['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Appointment', appointmentSchema);
