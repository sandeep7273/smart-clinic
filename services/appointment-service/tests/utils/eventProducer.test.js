
const { OutboxEvent } = require('../../src/models/OutboxEvent');
const { publishEvent, publishEventDirect, processOutboxEvents } = require('../../../src/utils/eventProducer');
const { Kafka } = require('kafkajs');

jest.mock('../../../src/models/OutboxEvent');
jest.mock('kafkajs');

const mockKafka = {
    producer: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
    })),
  };
  
Kafka.mockImplementation(() => mockKafka);
  

describe('Event Producer', () => {
  describe('publishEvent', () => {
    it('should save an event to the outbox', async () => {
      const payload = { appointmentId: '1', tenantId: 'tenant1' };
      OutboxEvent.createOutboxEvent.mockResolvedValue({ eventId: 'evt1' });

      const result = await publishEvent('APPOINTMENT_CREATED', payload);

      expect(OutboxEvent.createOutboxEvent).toHaveBeenCalled();
      expect(result).toHaveProperty('eventId');
    });
  });

  describe('processOutboxEvents', () => {
    it('should process pending events from the outbox', async () => {
      const mockEvents = [
        {
          eventId: 'evt1',
          topic: 'topic1',
          eventType: 'type1',
          payload: { id: '1' },
        },
      ];
      OutboxEvent.getPendingEvents.mockResolvedValue(mockEvents);
      OutboxEvent.markPublished.mockResolvedValue(true);
      
      const producer = { send: jest.fn() };
      mockKafka.producer.mockReturnValue(producer);


      const count = await processOutboxEvents();

      expect(count).toBe(1);
      expect(OutboxEvent.markPublished).toHaveBeenCalledWith('evt1');
    });
  });
});
