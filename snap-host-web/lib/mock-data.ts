export const mockProject = {
  id: "proj_123",
  name: "snap-host-next",
  gitURL: "https://github.com/username/snap-host-next",
  userId: "user_123",
  subDomain: "snap-host-next.vercel.app",
  customDomain: "snap-host.example.com",
  githubWebhookId: 12345,
  createdAt: new Date("2023-12-10T10:00:00Z"),
  updatedAt: new Date("2023-12-10T10:00:00Z"),
}

export const mockDeployments = [
  {
    id: "depl_1",
    projectId: "proj_123",
    status: "NOT_STARTED",
    createdAt: new Date("2023-12-10T12:35:00Z"),
    updatedAt: new Date("2023-12-10T12:35:00Z"),
  },
  {
    id: "depl_2",
    projectId: "proj_123",
    status: "READY",
    createdAt: new Date("2023-12-10T12:30:00Z"),
    updatedAt: new Date("2023-12-10T12:30:00Z"),
  },
  {
    id: "depl_3",
    projectId: "proj_123",
    status: "NOT_STARTED",
    createdAt: new Date("2023-12-10T12:25:00Z"),
    updatedAt: new Date("2023-12-10T12:25:00Z"),
  },
]

