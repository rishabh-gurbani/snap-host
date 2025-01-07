import { InferSelectModel, relations } from "drizzle-orm";
import {
    pgTable,
    text,
    timestamp,
    boolean,
    pgEnum,
    uuid,
    varchar,
    integer,
    index,
    foreignKey,
    AnyPgColumn,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull(),
    image: text("image"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
        .notNull()
        .references(() => user.id),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
        .notNull()
        .references(() => user.id),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt"),
});

export const deploymentStatusEnum = pgEnum("deployment_status", [
    "NOT_STARTED",
    "QUEUED",
    "IN_PROGRESS",
    "READY",
    "FAIL",
]);

export const projects = pgTable(
    "projects",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        name: varchar("name", { length: 255 }),
        gitURL: text("git_url"),
        userId: text("user_id").references(() => user.id),
        subDomain: varchar("subdomain", { length: 255 }),
        customDomain: varchar("custom_domain", { length: 255 }),
        githubWebhookId: integer("github_webhook_id"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
        currentDeploymentId: uuid("currentDeploymentId"),
    },
    (projects) => ({
        currentDeploymentIdFK: foreignKey({
            columns: [projects.currentDeploymentId],
            foreignColumns: [deployments.id],
        }),
    })
);

export type Project = InferSelectModel<typeof projects>;

export const deployments = pgTable("deployments", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references((): AnyPgColumn => projects.id),
    status: deploymentStatusEnum("status").default("NOT_STARTED"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    comments: text(),
    logsArchived: boolean("logs_archived").default(false),
});

export const logs = pgTable(
    "logs",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        deploymentId: uuid("deployment_id").references(() => deployments.id),
        message: text("message").notNull(),
        type: text("type").notNull(), // 'log' or 'status'
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => {
        return {
            deploymentIndex: index("deployment_id_idx").on(table.deploymentId),
        };
    }
);

export const userRelations = relations(user, ({ many }) => ({
    projects: many(projects),
    sessions: many(session),
    accounts: many(account),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
    user: one(user, {
        fields: [projects.userId],
        references: [user.id],
    }),
    deployments: many(deployments),
}));

export const deploymentRelations = relations(deployments, ({ one, many }) => ({
    project: one(projects, {
        fields: [deployments.projectId],
        references: [projects.id],
    }),
    logs: many(logs),
}));

export const logRelations = relations(logs, ({ one }) => ({
    deployment: one(deployments, {
        fields: [logs.deploymentId],
        references: [deployments.id],
    }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));
