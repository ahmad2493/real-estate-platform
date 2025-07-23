const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property', 
    required: true 
  },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  agent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent',
    required: true 
  },
  // Appointment details
  scheduledDate: { 
    type: Date, 
    required: true 
  },
  duration: { 
    type: Number, 
    default: 60 // minutes
  },
  type: { 
    type: String, 
    enum: ['Property Viewing', 'Virtual Tour', 'Consultation', 'Document Signing', 'Other'],
    default: 'Property Viewing'
  },
  // Meeting details
  meetingMode: { 
    type: String, 
    enum: ['In-Person', 'Virtual', 'Phone'],
    default: 'In-Person'
  },
  location: {
    address: String, // For in-person meetings
    meetingLink: String, // For virtual meetings
    instructions: String
  },
  // Participants and notes
  attendees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmed: { type: Boolean, default: false },
    role: { type: String, enum: ['Primary', 'Secondary', 'Observer'] }
  }],
  notes: {
    agentNotes: String, // Private notes for agent
    clientRequests: String, // Special requests from client
    followUpActions: [String]
  },
  // Status and tracking
  status: { 
    type: String, 
    enum: ['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  // Reminders and notifications
  reminders: [{
    sentAt: Date,
    type: { type: String, enum: ['Email', 'SMS', 'Push'] },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  // Post-appointment feedback
  feedback: {
    clientRating: { type: Number, min: 1, max: 5 },
    clientComments: String,
    agentRating: { type: Number, min: 1, max: 5 },
    agentComments: String,
    interested: { type: Boolean }, // Client interest level
    nextSteps: String
  },
  // Timezone handling
  timezone: { 
    type: String, 
    default: 'America/New_York' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);