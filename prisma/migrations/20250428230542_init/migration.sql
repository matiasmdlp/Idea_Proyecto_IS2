-- CreateTable
CREATE TABLE "user" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50),
    "defaultLatitude" DECIMAL(10,8),
    "defaultLongitude" DECIMAL(11,8),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "iconName" VARCHAR(50),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity_preferences" (
    "preferencesId" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "activityId" BIGINT NOT NULL,
    "minTemp" SMALLINT,
    "maxTemp" SMALLINT,
    "maxWindSpeed" SMALLINT,
    "maxPrecipitationProbability" SMALLINT,
    "maxPrecipitationIntensity" DECIMAL(4,2),
    "requiresNoPrecipitation" BOOLEAN NOT NULL DEFAULT false,
    "maxUv" SMALLINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_activity_preferences_pkey" PRIMARY KEY ("preferencesId")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "activityId" BIGINT NOT NULL,
    "periodicidad" INTEGER NOT NULL DEFAULT 0,
    "fecha" DATE NOT NULL,
    "horaInicio" TIME NOT NULL,
    "horaFin" TIME NOT NULL,
    "notes" TEXT,
    "locationLatitude" DECIMAL(10,8),
    "locationLongitude" DECIMAL(11,8),
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderOffsetMinutes" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "activities_name_userId_key" ON "activities"("name", "userId");

-- CreateIndex
CREATE INDEX "user_activity_preferences_userId_idx" ON "user_activity_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_activity_preferences_activityId_idx" ON "user_activity_preferences"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "user_activity_preferences_userId_activityId_key" ON "user_activity_preferences"("userId", "activityId");

-- CreateIndex
CREATE INDEX "Agenda_userId_idx" ON "Agenda"("userId");

-- CreateIndex
CREATE INDEX "Agenda_fecha_idx" ON "Agenda"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_preferences" ADD CONSTRAINT "user_activity_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_preferences" ADD CONSTRAINT "user_activity_preferences_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
