// Force IPv4 DNS resolution — ECS Service Connect DNS may return IPv6 first.
require("dns").setDefaultResultOrder("ipv4first");

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const config = require("../config");
const logger = require("../utils/logger");
const { createCloudMapGrpcClient } = require("./cloudMapGrpcClient");

class DoctorGrpcClient {
  constructor() {
    this.client = null;
  }

  initialize() {
    try {
      const PROTO_PATH = path.join(__dirname, "../../proto/doctor.proto");

      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const doctorProto = grpc.loadPackageDefinition(packageDefinition).doctor;

      const address = `${config.services.doctor.grpcHost}:${config.services.doctor.grpcPort}`;

      this.client = createCloudMapGrpcClient({
        configuredTarget: address,
        createClient: (target) =>
          new doctorProto.DoctorService(
            target,
            grpc.credentials.createInsecure(),
          ),
        logger,
        logPrefix: "AI Doctor gRPC Client",
      });

      logger.info(`Doctor gRPC client initialized at ${address}`);
    } catch (error) {
      logger.error("Failed to initialize Doctor gRPC client:", error);
      throw error;
    }
  }

  /**
   * Get doctor details by ID
   */
  async getDoctorDetails(doctorId, authToken) {
    return this.client.call("GetDoctorDetails", {
      doctor_id: doctorId,
      auth_token: authToken,
    });
  }

  /**
   * Check doctor availability
   */
  async checkAvailability(doctorId, date, startTime, endTime, authToken) {
    return this.client.call("CheckAvailability", {
      doctor_id: doctorId,
      date,
      start_time: startTime,
      end_time: endTime,
      auth_token: authToken,
    });
  }

  /**
   * Get doctors by specialization
   */
  async getDoctorsBySpecialization(
    specialization,
    authToken,
    limit = 10,
    page = 1,
  ) {
    return this.client.call("GetDoctorsBySpecialization", {
      specialization,
      auth_token: authToken,
      limit,
      page,
    });
  }

  /**
   * Search doctors with filters
   */
  async searchDoctors(filters, authToken) {
    return new Promise((resolve, reject) => {
      const request = {
        search: filters.search || "",
        specialization: filters.specialization || "",
        city: filters.city || "",
        state: filters.state || "",
        min_rating: filters.minRating || 0,
        max_fee: filters.maxFee || 0,
        language: filters.language || "",
        auth_token: authToken || "",
        limit: filters.limit || 10,
        page: filters.page || 1,
        sort_by: filters.sortBy || "rating",
        sort_order: filters.sortOrder || "desc",
      };

      logger.info("AI Service: Calling SearchDoctors gRPC", {
        filters: request,
      });

      this.client
        .call("SearchDoctors", request)
        .then((response) => {
          logger.info("AI Service: SearchDoctors response", {
            success: response.success,
            count: response.doctors?.length,
            total: response.total_count,
          });
          resolve(response);
        })
        .catch((error) => {
          logger.error("Error searching doctors via gRPC:", error);
          reject(error);
        });
    });
  }
}

module.exports = new DoctorGrpcClient();
