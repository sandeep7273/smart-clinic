const doctorService = require('../services/doctor.service');
const logger = require('../utils/logger');

class DoctorController {
  /**
   * Create a new doctor profile
   * POST /api/doctors
   */
  async createDoctor(req, res, next) {
    try {
      const userId = req.user.id;
      req.body.createdByUserId = userId;
      console.log(`debugging Creating doctor profile for user: ${userId}`);
      const doctor = await doctorService.createDoctor(userId, req.body);
      
      res.status(201).json({
        success: true,
        data: doctor,
        message: 'Doctor profile created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctor by ID
   * GET /api/doctors/:id
   */
  async getDoctorById(req, res, next) {
    try {
      console.log(`debugging Fetching doctor with ID: ${req.params.id}`);
      const doctor = await doctorService.getDoctorById(req.params.id);
      
      res.status(200).json({
        success: true,
        data: doctor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current doctor's profile
   * GET /api/doctors/me
   */
  async getMyProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const doctor = await doctorService.getDoctorByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: doctor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update doctor profile
   * PUT /api/doctors/:id
   */
  async updateDoctor(req, res, next) {
    try {
      const doctor = await doctorService.updateDoctor(req.params.id, req.body);
      
      res.status(200).json({
        success: true,
        data: doctor,
        message: 'Doctor profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete doctor profile
   * DELETE /api/doctors/:id
   */
  async deleteDoctor(req, res, next) {
    try {
      const result = await doctorService.deleteDoctor(req.params.id);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all doctors with pagination and sorting
   * GET /api/doctors
   */
  async getAllDoctors(req, res, next) {
    try {
      const results = await doctorService.getAllDoctors(req.query);
      
      res.status(200).json({
        success: true,
        data: results.doctors,
        pagination: results.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search doctors with comprehensive filters
   * GET /api/doctors/search
   */
  async searchDoctors(req, res, next) {
    try {
      const results = await doctorService.searchDoctors(req.query);
      
      res.status(200).json({
        success: true,
        data: results.doctors,
        pagination: results.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available doctors
   * GET /api/doctors/available
   */
  async getAvailableDoctors(req, res, next) {
    try {
      const results = await doctorService.getAvailableDoctors(req.query);
      
      res.status(200).json({
        success: true,
        data: results.doctors,
        pagination: results.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctors by specialization
   * GET /api/doctors/specialization/:specialization
   */
  async getDoctorsBySpecialization(req, res, next) {
    try {
      const results = await doctorService.getDoctorsBySpecialization(
        req.params.specialization,
        req.query
      );
      
      res.status(200).json({
        success: true,
        data: results.doctors,
        pagination: results.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add availability slot
   * POST /api/doctors/:id/slots
   */
  async addAvailabilitySlot(req, res, next) {
    try {
      const doctor = await doctorService.addAvailabilitySlot(
        req.params.id,
        req.body
      );
      
      res.status(201).json({
        success: true,
        data: doctor,
        message: 'Availability slot added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update slot status
   * PATCH /api/doctors/:id/slots/:slotId
   */
  async updateSlotStatus(req, res, next) {
    try {
      const doctor = await doctorService.updateSlotStatus(
        req.params.id,
        req.params.slotId,
        req.body.status
      );
      
      res.status(200).json({
        success: true,
        data: doctor,
        message: 'Slot status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get filter options for dropdowns
   * GET /api/doctors/filters/options
   */
  async getFilterOptions(req, res, next) {
    try {
      const options = await doctorService.getFilterOptions();
      
      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctor statistics
   * GET /api/doctors/:id/stats
   */
  async getDoctorStats(req, res, next) {
    try {
      const stats = await doctorService.getDoctorStats(req.params.id);
      
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync all doctors to read view (for testing/demo purposes)
   * POST /api/doctors/sync-read-view
   */
  async syncRecordsDoctorToReadView(req, res, next) {
    try {
      await doctorService.syncRecordsDoctorToReadView();
      
      res.status(200).json({
        success: true,
        message: 'Doctor read view synchronized successfully',
      });
    } catch (error) {
      next(error);
    }
  }
   
}

module.exports = new DoctorController();
