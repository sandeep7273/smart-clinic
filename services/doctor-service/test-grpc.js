const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto
const PROTO_PATH = path.join(__dirname, '../doctor-service/proto/doctor.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const doctorProto = grpc.loadPackageDefinition(packageDefinition).doctor;

// Create client
const client = new doctorProto.DoctorService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

console.log('Testing GetDoctorsBySpecialization...');

client.GetDoctorsBySpecialization(
  {
    specialization: 'Cardiologist',
    auth_token: 'test-token',
    limit: 10,
    page: 1
  },
  (error, response) => {
    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('Success:', response.success);
      console.log('Message:', response.message);
      console.log('Total count:', response.total_count);
      console.log('Doctors found:', response.doctors ? response.doctors.length : 0);
      if (response.doctors && response.doctors.length > 0) {
        console.log('First doctor:', response.doctors[0].firstName, response.doctors[0].lastName);
      }
    }
    process.exit(0);
  }
);
