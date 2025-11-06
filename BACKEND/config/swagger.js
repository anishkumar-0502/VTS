const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Vehicle Tracking System (VTS) API',
        version: '1.0.0',
        description: 'Comprehensive REST API documentation for the Vehicle Tracking System backend. Includes authentication, operator management, driver management, vehicle tracking, and parent/guardian features.',
        contact: {
            name: 'VTS Team',
            email: 'support@vts.com',
            url: 'https://vts.com'
        },
        license: {
            name: 'ISC',
            url: 'https://opensource.org/licenses/ISC'
        }
    },
    servers: [
        {
            url: 'http://localhost:8787',
            description: 'Development Server',
            variables: {
                protocol: {
                    default: 'http'
                },
                host: {
                    default: 'localhost'
                },
                port: {
                    default: '8787'
                }
            }
        },
        {
            url: 'https://api.vts.com',
            description: 'Production Server'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
            }
        },
        schemas: {
            // ============ Common Response Schemas ============
            SuccessResponse: {
                type: 'object',
                properties: {
                    error: {
                        type: 'boolean',
                        example: false
                    },
                    message: {
                        type: 'string',
                        example: 'Operation successful'
                    },
                    data: {
                        type: 'object'
                    }
                }
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    error: {
                        type: 'boolean',
                        example: true
                    },
                    message: {
                        type: 'string',
                        example: 'An error occurred'
                    }
                }
            },

            // ============ Auth Schemas ============
            RegisterRequest: {
                type: 'object',
                required: ['name', 'email', 'phone_number', 'password', 'role_name'],
                properties: {
                    name: {
                        type: 'string',
                        example: 'John Doe'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'john@example.com'
                    },
                    phone_number: {
                        type: 'string',
                        example: '1234567890'
                    },
                    password: {
                        type: 'string',
                        format: 'password',
                        example: 'SecurePassword123!'
                    },
                    role_name: {
                        type: 'string',
                        enum: ['superadmin', 'operator', 'driver', 'parent'],
                        example: 'operator'
                    }
                }
            },
            LoginRequest: {
                type: 'object',
                required: ['email', 'password', 'role_id'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'john@example.com'
                    },
                    password: {
                        type: 'string',
                        format: 'password',
                        example: 'SecurePassword123!'
                    },
                    role_id: {
                        type: 'integer',
                        enum: [1, 2, 3, 4],
                        description: '1=Superadmin, 2=Operator, 3=Driver, 4=Guardian/Parent',
                        example: 2
                    }
                }
            },
            LoginResponse: {
                type: 'object',
                properties: {
                    error: {
                        type: 'boolean',
                        example: false
                    },
                    message: {
                        type: 'string',
                        example: 'Login successful'
                    },
                    data: {
                        type: 'object',
                        properties: {
                            user: {
                                type: 'object',
                                properties: {
                                    user_id: { type: 'string' },
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    phone_number: { type: 'string' },
                                    role_id: { type: 'integer' },
                                    status: { type: 'boolean' }
                                }
                            },
                            token: {
                                type: 'string',
                                description: 'JWT Token to be used in Authorization header'
                            }
                        }
                    }
                }
            },
            ChangePasswordRequest: {
                type: 'object',
                required: ['oldPassword', 'newPassword'],
                properties: {
                    oldPassword: {
                        type: 'string',
                        format: 'password',
                        example: 'OldPassword123!'
                    },
                    newPassword: {
                        type: 'string',
                        format: 'password',
                        example: 'NewPassword123!'
                    }
                }
            },

            // ============ Operator Schemas ============
            CreateOperatorRequest: {
                type: 'object',
                required: ['name', 'email', 'phone_number', 'company_name'],
                properties: {
                    name: {
                        type: 'string',
                        example: 'Operator Inc.'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'operator@company.com'
                    },
                    phone_number: {
                        type: 'string',
                        example: '+1234567890'
                    },
                    company_name: {
                        type: 'string',
                        example: 'Operator Company Ltd.'
                    },
                    registration_number: {
                        type: 'string',
                        example: 'REG123456'
                    },
                    address: {
                        type: 'string',
                        example: '123 Main Street'
                    },
                    city: {
                        type: 'string',
                        example: 'New York'
                    },
                    state: {
                        type: 'string',
                        example: 'NY'
                    },
                    postal_code: {
                        type: 'string',
                        example: '10001'
                    },
                    country: {
                        type: 'string',
                        example: 'United States'
                    }
                }
            },

            // ============ Device Schemas ============
            CreateDeviceRequest: {
                type: 'object',
                required: ['device_id', 'imei'],
                properties: {
                    device_id: {
                        type: 'string',
                        example: 'DEV-001'
                    },
                    imei: {
                        type: 'string',
                        example: '351757015017963'
                    },
                    device_type: {
                        type: 'string',
                        example: 'gps_tracker'
                    },
                    sim_number: {
                        type: 'string',
                        example: '8991234567890123456'
                    },
                    firmware_version: {
                        type: 'string',
                        example: '1.0.0'
                    },
                    assigned_operator_id: {
                        type: 'string',
                        example: 'OP-123'
                    }
                }
            },

            // ============ Trip Schemas ============
            StartTripRequest: {
                type: 'object',
                required: ['vehicle_id', 'route_name', 'start_location'],
                properties: {
                    vehicle_id: {
                        type: 'string',
                        example: 'VEH-001'
                    },
                    route_name: {
                        type: 'string',
                        example: 'Route A to B'
                    },
                    start_location: {
                        type: 'object',
                        required: ['latitude', 'longitude'],
                        properties: {
                            latitude: {
                                type: 'number',
                                format: 'float',
                                example: 40.7128
                            },
                            longitude: {
                                type: 'number',
                                format: 'float',
                                example: -74.0060
                            }
                        }
                    }
                }
            },
            EndTripRequest: {
                type: 'object',
                required: ['end_location', 'distance_traveled'],
                properties: {
                    end_location: {
                        type: 'object',
                        required: ['latitude', 'longitude'],
                        properties: {
                            latitude: {
                                type: 'number',
                                format: 'float',
                                example: 40.7580
                            },
                            longitude: {
                                type: 'number',
                                format: 'float',
                                example: -73.9855
                            }
                        }
                    },
                    distance_traveled: {
                        type: 'number',
                        format: 'float',
                        example: 5.5
                    }
                }
            },

            // ============ Role Schemas ============
            CreateRoleRequest: {
                type: 'object',
                required: ['role_name'],
                properties: {
                    role_name: {
                        type: 'string',
                        example: 'custom_role'
                    },
                    permissions: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['create_user', 'edit_user', 'view_reports']
                    },
                    description: {
                        type: 'string',
                        example: 'Custom role for operators'
                    }
                }
            }
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ],
    tags: [
        {
            name: 'Auth',
            description: 'Authentication endpoints (public, no token required)'
        },
        {
            name: 'SuperAdmin',
            description: 'Super Administrator endpoints (admin only)'
        },
        {
            name: 'Operator',
            description: 'Operator management endpoints'
        },
        {
            name: 'Driver',
            description: 'Driver and trip management endpoints'
        },
        {
            name: 'Parent/Guardian',
            description: 'Parent/Guardian tracking and notification endpoints'
        },
        {
            name: 'Health',
            description: 'System health and status endpoints'
        }
    ]
};

// Options for the swagger docs
const options = {
    definition: swaggerDefinition,
    apis: [
        path.join(__dirname, '../routes/authRoutes.js'),
        path.join(__dirname, '../routes/superadminRoutes.js'),
        path.join(__dirname, '../routes/operatorRoutes.js'),
        path.join(__dirname, '../routes/driverRoutes.js'),
        path.join(__dirname, '../routes/parentRoutes.js')
    ]
};

const swaggerSpec = swaggerJsdoc(options);

// Middleware setup
const setupSwaggerDocs = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            showExtensions: true,
            layout: 'BaseLayout'
        },
        customCss: `
      .swagger-ui .topbar {
        background-color: #2c3e50;
      }
      .swagger-ui .info .title {
        color: #2c3e50;
      }
      .swagger-ui .btn {
        background-color: #27ae60;
      }
      .swagger-ui .model-example {
        background-color: #f8f9fa;
      }
    `,
        customSiteTitle: 'VTS API Documentation'
    }));

    // Serve the OpenAPI spec as JSON
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};

module.exports = { setupSwaggerDocs, swaggerSpec };