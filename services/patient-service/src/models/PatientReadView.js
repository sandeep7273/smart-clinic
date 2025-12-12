const mongoose = require('mongoose');

/**
 * Read-oply view for Patient data for CQRS pattern
 * This is denormalised, indexeed collection optimized for read operations
 * Upate via events from write model (Patient)
 */

const patientReadViewSchema = new mongoose.Schema({
    //link to write model
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true,
    },
    userId: {
        type: String,
        index: true,
    },

    // Denormalised data for fast read operations
    fullName: {
            type: String,
            index: true,
        },
    firstName: {
            type: String,
             index: true,
        },
        lastName: {
            type: String,
             index: true,
        },
        email: {
            type: String,
            index: true,
        },
        phone: {
            type: String,
             index: true,
        },
        /// computaed field
        age: Number,
        dateOfBirth:  Date,
        gender: String,
        bloodType: String,

        // Address
        city: {
            type: String,
            index: true,
        },
        state: {
            type: String,
            index: true,
        },
        zipCode: String,
        fullAddress: String,
        
        // Medical Summmary
        medicalHistoryCount: {
            type: Number,
            default: 0,
        },
        allergiesCount: {
            type: Number,
            default: 0,
        },
        medicationCount : {
            type: Number,
            default: 0,
        },
        hasActiveConditions: {
            type: Boolean,
            index: true,
        },
        // status
        status: {
            type: String,
            index: true,
        },
        // timiestamps
        registrationDate: Date,
        lastUpdated: Date,
        lastVisitDate: Date,

        // searchable text index
        searchText: {
            type: String,
            index: true,
        },
    }, { 
        timestamps: false
    });


    // compound indexes for common queries
    patientReadViewSchema.index({ status: 1, city: 1 });
    patientReadViewSchema.index({ hasActiveConditions: 1 });
    patientReadViewSchema.index({ lastName: 'text', firstName: 'text' });
    patientReadViewSchema.index({ registrationDate: 'text' });
    patientReadViewSchema.index({ lastVisitDate: 'text' });

    // text index for search
    patientReadViewSchema.index({ searchText: 'text' });

    /**
     * updte read view from patient document
     * @param {Object} patient - Patient document from write model
     */
    patientReadViewSchema.statics.updateFromPatient = async function(patient) {
        const readViewData = {
            patientId: patient._id,
            userId: patient.userId,
            fullName: `${patient.firstName} ${patient.lastName}`,
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patient.email,
            phone: patient.phone,
            dateOfBirth: patient.dateOfBirth,
            age: patient.age,
            gender: patient.gender,
            bloodType: patient.bloodType,
            city: patient.city,
            state: patient.state,
            zipCode: patient.zipCode,
            fullAddress: patient.address?`${patient.address.street || ''}, ${patient.address.city || ''}, ${patient.address.state || ''} ${patient.address.zipCode || ''    }`.trim():'',
            medicalHistoryCount: patient.medicalHistory.length || 0,
            allergiesCount: patient.allergies.length || 0,
            medicationCount: patient.currentMedications.length || 0,
            hasActiveConditions: (patient.medicalHistory?.some(h => h.status === 'active' || h.status === 'chronic' )) || false,
            status: patient.status,
            registrationDate: patient.registrationDate,
            lastVisitDate: patient.lastVisitDate,
            lastUpdated: new Date(),
            
            // concatenate fields for search
            searchText: [
                patient.firstName,
                patient.lastName,
                patient.email,
                patient.userId,
                patient.city,
                patient.state,
            ].filter(Boolean).join(' '),
        };

        await this.findOneAndUpdate(
            { patientId: patient._id },
            readViewData,
            { upsert: true, new: true }
        );
    };

    /**
     * Delete read view
     */

    patientReadViewSchema.statics.deleteByPatientId = async function(patientId) {
        await this.deleteOne({ patientId });
    };

    const PatientReadView = mongoose.model('PatientReadView', patientReadViewSchema);

    module.exports = PatientReadView;