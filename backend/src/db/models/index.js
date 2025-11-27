import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize, DataTypes } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const databaseUrl = process.env.DATABASE_URL;
const configuredDialect = (process.env.DB_DIALECT || '').toLowerCase();
const isRender = !!process.env.RENDER; // Render inyecta RENDER=true
let sequelize;

const DEFAULT_TIMEZONE = 'Z';

if (databaseUrl) {
  const options = { logging: false };
  try {
    const parsed = new URL(databaseUrl);
    const isPostgres = parsed.protocol.startsWith('postgres');
    if (isPostgres) {
      options.dialect = 'postgres';
      options.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Render/managed DBs often use self-signed certs
        },
      };
      options.pool = { max: 10, min: 0, idle: 10000 };
    }
  } catch {
    // continue with defaults
  }
  sequelize = new Sequelize(databaseUrl, options);
} else if (!configuredDialect || configuredDialect === 'sqlite') {
  //if (isRender) {
    // Render sin DATABASE_URL: evita escribir en disco efimero. Mejor abortar.
    //throw new Error('DATABASE_URL es obligatorio en Render (usa Postgres administrado)');
  //}
  ensureDir(DATA_DIR);
  const storage = process.env.DB_SQLITE_PATH || path.join(DATA_DIR, 'coderonin.db');
  ensureDir(path.dirname(storage));
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'coderonin',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      dialect: configuredDialect,
      logging: false,
      timezone: DEFAULT_TIMEZONE,
    }
  );
}

function jsonColumn(fieldName, defaultValue = []) {
  return {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue(fieldName);
      if (!raw) return defaultValue;
      try {
        const parsed = JSON.parse(raw);
        return parsed ?? defaultValue;
      } catch {
        return defaultValue;
      }
    },
    set(value) {
      if (value == null) {
        this.setDataValue(fieldName, null);
      } else {
        this.setDataValue(fieldName, JSON.stringify(value));
      }
    },
  };
}

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    username: { type: DataTypes.STRING(64), unique: true, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING(32) },
    roles: jsonColumn('roles', []),
    displayName: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    avatarUrl: { type: DataTypes.STRING },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'users',
    timestamps: true,
    indexes: [{ unique: true, fields: ['username'] }],
  }
);

const Course = sequelize.define(
  'Course',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    image: { type: DataTypes.STRING, defaultValue: '' },
    tags: jsonColumn('tags', []),
    modalidad: { type: DataTypes.STRING(32), defaultValue: 'virtual' },
    price: { type: DataTypes.STRING },
    link: { type: DataTypes.STRING },
    category: { type: DataTypes.STRING },
    isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    archivedAt: { type: DataTypes.DATE },
  },
  { tableName: 'courses', timestamps: true }
);

const CourseModule = sequelize.define(
  'CourseModule',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    courseId: { type: DataTypes.UUID, allowNull: false },
    courseName: { type: DataTypes.STRING(180), allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    ordering: { type: DataTypes.INTEGER, defaultValue: 0 },
    resourceType: { type: DataTypes.STRING(16), allowNull: false },
    resourceUrl: { type: DataTypes.STRING },
    resourcePath: { type: DataTypes.STRING },
    resourceName: { type: DataTypes.STRING },
    resourceMime: { type: DataTypes.STRING },
    durationMins: { type: DataTypes.INTEGER },
  },
  { tableName: 'course_modules', timestamps: true }
);

const Service = sequelize.define(
  'Service',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    image: { type: DataTypes.STRING, defaultValue: '' },
    tags: jsonColumn('tags', []),
  },
  { tableName: 'services', timestamps: true }
);

const Mission = sequelize.define(
  'Mission',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    slug: { type: DataTypes.STRING(180), unique: true },
    category: { type: DataTypes.STRING(32), allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: false },
    summary: { type: DataTypes.TEXT, defaultValue: '' },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    requirements: { type: DataTypes.TEXT, defaultValue: '' },
    difficulty: { type: DataTypes.STRING(32), defaultValue: 'media' },
    reward: { type: DataTypes.STRING, defaultValue: '' },
    status: { type: DataTypes.STRING(32), defaultValue: 'borrador' },
    tags: jsonColumn('tags', []),
    tools: jsonColumn('tools', []),
    image: { type: DataTypes.STRING, defaultValue: '' },
  },
  { tableName: 'missions', timestamps: true }
);

const MissionProgress = sequelize.define(
  'MissionProgress',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    missionId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(32), defaultValue: 'pendiente' },
    progress: { type: DataTypes.INTEGER, defaultValue: 0 },
    notes: { type: DataTypes.TEXT, defaultValue: '' },
  },
  { tableName: 'mission_progress', timestamps: true, indexes: [{ unique: true, fields: ['missionId', 'userId'] }] }
);

const MissionFile = sequelize.define(
  'MissionFile',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    missionId: { type: DataTypes.UUID, allowNull: false },
    storageDir: { type: DataTypes.STRING, allowNull: false },
    storedName: { type: DataTypes.STRING, allowNull: false },
    displayName: { type: DataTypes.STRING, allowNull: false },
    mime: { type: DataTypes.STRING, defaultValue: '' },
    size: { type: DataTypes.INTEGER, defaultValue: 0 },
    relativePath: { type: DataTypes.STRING, allowNull: false },
    kind: { type: DataTypes.STRING(16), defaultValue: 'file' },
    uploadedByUserId: { type: DataTypes.UUID },
  },
  { tableName: 'mission_files', timestamps: true, updatedAt: false }
);

const Tool = sequelize.define(
  'Tool',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    link: { type: DataTypes.STRING, defaultValue: '' },
    image: { type: DataTypes.STRING, defaultValue: '' },
    tags: jsonColumn('tags', []),
    badge: { type: DataTypes.STRING, defaultValue: '' },
    isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: 'tools', timestamps: true }
);

const CourseInquiry = sequelize.define(
  'CourseInquiry',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    nombre: { type: DataTypes.STRING(180), allowNull: false },
    email: { type: DataTypes.STRING(180), allowNull: false },
    empresa: { type: DataTypes.STRING },
    interes: { type: DataTypes.STRING },
    modalidad: { type: DataTypes.STRING },
    mensaje: { type: DataTypes.TEXT },
    ip: { type: DataTypes.STRING(64) },
    userAgent: { type: DataTypes.TEXT },
  },
  { tableName: 'course_inquiries', timestamps: true }
);

const MissionInquiry = sequelize.define(
  'MissionInquiry',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    nombre: { type: DataTypes.STRING(180), allowNull: false },
    email: { type: DataTypes.STRING(180), allowNull: false },
    empresa: { type: DataTypes.STRING },
    categoria: { type: DataTypes.STRING },
    interes: { type: DataTypes.STRING },
    tipo: { type: DataTypes.STRING },
    alcance: { type: DataTypes.STRING },
    ventanas: { type: DataTypes.STRING },
    restricciones: { type: DataTypes.TEXT },
    contacto: { type: DataTypes.STRING },
    ip: { type: DataTypes.STRING(64) },
    userAgent: { type: DataTypes.TEXT },
  },
  { tableName: 'mission_inquiries', timestamps: true }
);

const Report = sequelize.define(
  'Report',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title: { type: DataTypes.STRING(200), allowNull: false },
    summary: { type: DataTypes.TEXT, defaultValue: '' },
    clientId: { type: DataTypes.UUID, allowNull: false },
    shogunId: { type: DataTypes.UUID, allowNull: false },
    sponsorId: { type: DataTypes.UUID, allowNull: true },
    progress: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.STRING(64), defaultValue: 'iniciando' },
    service: { type: DataTypes.STRING, defaultValue: '' },
    tags: jsonColumn('tags', []),
  },
  { tableName: 'reports', timestamps: true }
);

const ReportAttachment = sequelize.define(
  'ReportAttachment',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    reportId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    storagePath: { type: DataTypes.STRING, allowNull: true },
    mime: { type: DataTypes.STRING, defaultValue: '' },
    size: { type: DataTypes.INTEGER, defaultValue: 0 },
    uploadedByUserId: { type: DataTypes.UUID },
    uploadedByUsername: { type: DataTypes.STRING, defaultValue: '' },
    uploadedByRole: { type: DataTypes.STRING, defaultValue: '' },
  },
  { tableName: 'report_attachments', timestamps: true, updatedAt: false }
);

const ReportChatMessage = sequelize.define(
  'ReportChatMessage',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    reportId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID },
    username: { type: DataTypes.STRING, defaultValue: '' },
    role: { type: DataTypes.STRING, defaultValue: '' },
    message: { type: DataTypes.TEXT, defaultValue: '' },
  },
  { tableName: 'report_chat_messages', timestamps: true, updatedAt: false }
);

const ReportChatAttachment = sequelize.define(
  'ReportChatAttachment',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    messageId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    storagePath: { type: DataTypes.STRING, allowNull: true },
    mime: { type: DataTypes.STRING, defaultValue: '' },
    size: { type: DataTypes.INTEGER, defaultValue: 0 },
    uploadedByUserId: { type: DataTypes.UUID },
    uploadedByUsername: { type: DataTypes.STRING, defaultValue: '' },
    uploadedByRole: { type: DataTypes.STRING, defaultValue: '' },
  },
  { tableName: 'report_chat_attachments', timestamps: true, updatedAt: false }
);

const UserCourseAccess = sequelize.define(
  'UserCourseAccess',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false },
    courseId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    tableName: 'user_course_access',
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ['userId', 'courseId'] }],
  }
);

const UserServiceAccess = sequelize.define(
  'UserServiceAccess',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false },
    serviceId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    tableName: 'user_service_access',
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ['userId', 'serviceId'] }],
  }
);

Course.hasMany(CourseModule, { as: 'modules', foreignKey: 'courseId', onDelete: 'CASCADE' });
CourseModule.belongsTo(Course, { foreignKey: 'courseId' });

Mission.hasMany(MissionProgress, { as: 'progressEntries', foreignKey: 'missionId', onDelete: 'CASCADE' });
MissionProgress.belongsTo(Mission, { foreignKey: 'missionId' });
Mission.hasMany(MissionFile, { as: 'files', foreignKey: 'missionId', onDelete: 'CASCADE' });
MissionFile.belongsTo(Mission, { foreignKey: 'missionId' });
MissionProgress.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(MissionProgress, { as: 'missionProgress', foreignKey: 'userId' });
MissionFile.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });
User.hasMany(MissionFile, { as: 'missionFiles', foreignKey: 'uploadedByUserId' });

Report.belongsTo(User, { as: 'client', foreignKey: 'clientId' });
Report.belongsTo(User, { as: 'shogun', foreignKey: 'shogunId' });
Report.belongsTo(User, { as: 'sponsor', foreignKey: 'sponsorId' });
User.hasMany(Report, { as: 'clientReports', foreignKey: 'clientId' });
User.hasMany(Report, { as: 'shogunReports', foreignKey: 'shogunId' });
User.hasMany(Report, { as: 'sponsoredReports', foreignKey: 'sponsorId' });

Report.hasMany(ReportAttachment, { as: 'attachments', foreignKey: 'reportId', onDelete: 'CASCADE' });
ReportAttachment.belongsTo(Report, { foreignKey: 'reportId' });
ReportAttachment.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploader' });
User.hasMany(ReportAttachment, { as: 'reportAttachments', foreignKey: 'uploadedByUserId' });

Report.hasMany(ReportChatMessage, { as: 'chat', foreignKey: 'reportId', onDelete: 'CASCADE' });
ReportChatMessage.belongsTo(Report, { foreignKey: 'reportId' });
ReportChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(ReportChatMessage, { as: 'chatMessages', foreignKey: 'userId' });

ReportChatMessage.hasMany(ReportChatAttachment, { as: 'attachments', foreignKey: 'messageId', onDelete: 'CASCADE' });
ReportChatAttachment.belongsTo(ReportChatMessage, { foreignKey: 'messageId' });
ReportChatAttachment.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'chatAttachmentUploader' });
User.hasMany(ReportChatAttachment, { as: 'chatAttachments', foreignKey: 'uploadedByUserId' });

UserCourseAccess.belongsTo(User, { foreignKey: 'userId' });
UserCourseAccess.belongsTo(Course, { foreignKey: 'courseId' });
User.hasMany(UserCourseAccess, { as: 'courseAccesses', foreignKey: 'userId' });
Course.hasMany(UserCourseAccess, { as: 'accessRecords', foreignKey: 'courseId' });

UserServiceAccess.belongsTo(User, { foreignKey: 'userId' });
UserServiceAccess.belongsTo(Service, { foreignKey: 'serviceId' });
User.hasMany(UserServiceAccess, { as: 'serviceAccesses', foreignKey: 'userId' });
Service.hasMany(UserServiceAccess, { as: 'accessRecords', foreignKey: 'serviceId' });

const PasswordResetRequest = sequelize.define(
  'PasswordResetRequest',
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    username: { type: DataTypes.STRING(64) },
    email: { type: DataTypes.STRING(180) },
    message: { type: DataTypes.TEXT, defaultValue: '' },
    status: { type: DataTypes.STRING(32), defaultValue: 'pending' },
    requestIp: { type: DataTypes.STRING(64) },
    resolvedAt: { type: DataTypes.DATE },
  },
  { tableName: 'password_reset_requests', timestamps: true, updatedAt: false }
);

PasswordResetRequest.belongsTo(User, { as: 'resolver', foreignKey: 'resolvedBy', allowNull: true });

const models = {
  sequelize,
  User,
  Course,
  CourseModule,
  Service,
  Mission,
  MissionProgress,
  MissionFile,
  Tool,
  CourseInquiry,
  MissionInquiry,
  Report,
  ReportAttachment,
  ReportChatMessage,
  ReportChatAttachment,
  UserCourseAccess,
  UserServiceAccess,
  PasswordResetRequest,
};

export { sequelize, Sequelize, DataTypes, models };
