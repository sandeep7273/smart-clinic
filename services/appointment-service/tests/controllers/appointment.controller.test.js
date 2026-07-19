
const appointmentController = require('../../src/controllers/appointment.controller');
const { Appointment } = require('../../src/models/Appointment');
const { AppointmentReadView } = require('../../src/models/AppointmentReadView');
const { AppointmentEvent } = require('../../src/models/AppointmentEvent');
const SagaOrchestrator = require('../../src/services/sagaOrchestrator');
const eventProducer = require('../../src/utils/eventProducer');
const { NotFoundError, ConflictError } = require('../../src/utils/errors');

jest.mock('../../src/models/Appointment');
jest.mock('../../src/models/AppointmentReadView');
jest.mock('../../src/models/AppointmentEvent');
jest.mock('../../src/services/sagaOrchestrator');
jest.mock('../../src/utils/eventProducer');

describe('Appointment Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'user1', tenantId: 'tenant1', role: 'user' },
      authToken: 'token',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('createAppointment', () => {
    it('should create an appointment successfully', async () => {
      const bookingData = {
        userId: 'user1',
        doctorId: 'doctor1',
        date: '2024-01-01',
        startTime: '10:00',
        endTime: '10:30',
        reason: 'Checkup',
      };
      req.body = bookingData;
      const mockAppointment = { _id: 'apt1', ...bookingData };
      SagaOrchestrator.prototype.bookAppointment.mockResolvedValue({ appointment: mockAppointment });

      await appointmentController.createAppointment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Appointment booked successfully',
        data: mockAppointment,
      });
    });
  });

  describe('getAllAppointments', () => {
    it('should return all appointments', async () => {
      const mockAppointments = [{ id: '1' }, { id: '2' }];
      const pagination = { total: 2, pages: 1 };
      AppointmentReadView.search.mockResolvedValue({data: mockAppointments, pagination});

      await appointmentController.getAllAppointments(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAppointments,
        pagination
      });
    });
  });

  describe('getAppointmentById', () => {
    it('should return an appointment by id', async () => {
        const mockAppointment = { _id: '1', reason: 'Checkup', isDeleted: false };
        req.params.id = '1';
        Appointment.findById.mockResolvedValue(mockAppointment);

        await appointmentController.getAppointmentById(req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: mockAppointment,
        });
    });

    it('should throw NotFoundError if appointment not found', async () => {
        req.params.id = '1';
        Appointment.findById.mockResolvedValue(null);
        await appointmentController.getAppointmentById(req, res, next);

        expect(next).toHaveBeenCalledWith(new NotFoundError('Appointment'));
    });
  });

  describe('updateAppointment', () => {
    it('should update an appointment', async () => {
        const mockAppointment = {
            _id: '1',
            reason: 'Checkup',
            isDeleted: false,
            notes: '',
            status: 'pending',
            save: jest.fn().mockResolvedValue(this),
        };
        req.params.id = '1';
        req.body = { notes: 'Updated notes', status: 'confirmed' };
        Appointment.findById.mockResolvedValue(mockAppointment);
        AppointmentEvent.createEvent.mockResolvedValue({});
        AppointmentReadView.updateFromAppointment.mockResolvedValue({});
        eventProducer.publishEvent.mockResolvedValue({});

        await appointmentController.updateAppointment(req, res, next);

        expect(mockAppointment.notes).toBe('Updated notes');
        expect(mockAppointment.status).toBe('confirmed');
        expect(mockAppointment.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel an appointment', async () => {
      const mockAppointment = {
        _id: '1',
        status: 'confirmed',
        isCancellable: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(this),
      };
      req.params.id = '1';
      req.body = { cancelReason: 'No longer needed' };
      Appointment.findById.mockResolvedValue(mockAppointment);
      AppointmentEvent.createEvent.mockResolvedValue({});
      AppointmentReadView.updateFromAppointment.mockResolvedValue({});
      eventProducer.publishEvent.mockResolvedValue({});

      await appointmentController.cancelAppointment(req, res, next);

      expect(mockAppointment.status).toBe('cancelled');
      expect(mockAppointment.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should throw ConflictError if appointment is not cancellable', async () => {
      const mockAppointment = {
        _id: '1',
        status: 'completed',
        isCancellable: jest.fn().mockReturnValue(false),
      };
      req.params.id = '1';
      Appointment.findById.mockResolvedValue(mockAppointment);

      await appointmentController.cancelAppointment(req, res, next);

      expect(next).toHaveBeenCalledWith(new ConflictError('Appointment cannot be cancelled at this time'));
    });
  });
});