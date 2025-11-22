const { required, string } = require('joi');
const mongoose = require('mongoose');

// Gender Enum
const GENDER = {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
    PREFER_NOT_TO_SAY: 'prefer_not_to_say'
}

// Blood Type Enum
const BLOOD_TYPE = {
    A_POS: 'A+',
    A_NEG: 'A-',
    B_POS: 'B+',
    B_NEG: 'B-',
    AB_POS: 'AB+',
    AB_NEG: 'AB-',
    O_POS: 'O+',
    O_NEG: 'O-',
    UNKNOWN: 'unknown'
}

// Patient status enum
const PATIENT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DECEASED: 'deceased'
}


// Address Subschema
const addressSchema = new mongoose.Schema({
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true }
}, { _id: false });

// emergency contact subschema
const emergencyContactSchema = new mongoose.Schema({
    name: { type: String, trim: true, required: true },
    relationship: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    email: { type: String, trim: true }
}, { _id: false });

// medical History subschema
const medicalHistoryItemSchema = new mongoose.Schema({
    condition: { type: String, trim: true, required: true },
    diagnosisDate: { type: Date },
    status: { type: String, enum: ['active', 'resolved', 'chronic'], default: 'active' },
    notes: { type: String, trim: true }
}, {
    _id: false
})


// allergy subschema
const allergySchema = new mongoose.Schema({
    allergen: { type: String, trim: true, required: true },
    reaction: { type: String, trim: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'moderate' }
}, { _id: false });

// medication subschema
const medicationSchema = new mongoose.Schema({
    name: { type: String, trim: true, required: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    prescribedBy: { type: String, trim: true },
    notes: { type: String, trim: true }
}, { _id: false });


const patientSchema = new mongoose.Schema({
    // Lint to Auth Service user Id
    userId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },

    // Personal Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        enum: Object.values(GENDER)
    },
    bloodType: {
        type: String,
        enum: Object.values(BLOOD_TYPE),
        default: BLOOD_TYPE.UNKNOWN
    },

    // Address
    address: {
        type: addressSchema,
    },

    // Emergency Contact
    emergencyContact: {
        type: emergencyContactSchema,
    },

    // Medical Information
    medicalHistory: [medicalHistoryItemSchema],
    allergies: [allergySchema],
    currentMedications: [medicationSchema],

    // Insurance Information
    insuranceProvider: {
        type: String,
        trim: true
    },
    insurancePolicyNumber: {
        type: String,
        trim: true
    },
    insuranceGroupNumber: {
        type: String,
        trim: true
    },

    // status
    status: {
        type: String,
        enum: Object.values(PATIENT_STATUS),
        default: PATIENT_STATUS.ACTIVE
    },

    // Metadata
    registrationDate: {
        type: Date,
        default: Date.now
    },
    lastVisitDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        },
    },
})

// Indexes for faster queries
patientSchema.index({ email: 1 })
patientSchema.index({ userId: 1 })
patientSchema.index({ lastName: 1, firstName: 1 })
patientSchema.index({registrationDate: -1})

// Virtrual for full name
patientSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// virtual for age
patientSchema.virtual('age').get(function () {
    if(!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if(monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age; 
})

// instance method to add medical hostory
patientSchema.methods.addMedicalHistoryItem = function (item) {
    this.medicalHistory.push(item);
    return this.save();
}

// instance method to add allergy
patientSchema.methods.addAllergy = function (allergy) {
    const existing = this.allergies.find(a => a.allergen.toLowerCase() === allergy.allergen.toLowerCase());
    if(existing) {
        Object.assign(existing, allergy);
    } else {
        this.allergies.push(allergy);
    }
    return this.save(); 
}

// instance method to add medication
patientSchema.methods.addMedication = function (medication) {
    this.currentMedications.push(medication);
    return this.save();
};

// static method to find by email
patientSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase().trim() });
}

// static method to find by userId
patientSchema.statics.findByUserId = function (userId) {
    return this.findOne({ userId: userId.trim() });
}

const Patient = mongoose.model('Patient', patientSchema);

module.exports = {
    Patient,
    GENDER,
    BLOOD_TYPE,
    PATIENT_STATUS
};