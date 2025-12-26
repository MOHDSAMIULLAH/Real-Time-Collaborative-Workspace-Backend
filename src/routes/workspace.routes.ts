import { Router } from 'express';
import { workspaceController } from '../controllers/workspace.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createWorkspaceSchema } from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /projects/{projectId}/workspaces:
 *   post:
 *     tags: [Workspaces]
 *     summary: Create a new workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Workspace created successfully
 */
router.post(
  '/projects/:projectId/workspaces',
  validate(createWorkspaceSchema),
  workspaceController.createWorkspace.bind(workspaceController)
);

/**
 * @swagger
 * /projects/{projectId}/workspaces:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get all workspaces for a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of workspaces
 */
router.get('/projects/:projectId/workspaces', workspaceController.getWorkspaces.bind(workspaceController));

/**
 * @swagger
 * /workspaces/{workspaceId}:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get workspace by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace details
 *       404:
 *         description: Workspace not found
 */
router.get('/workspaces/:workspaceId', workspaceController.getWorkspace.bind(workspaceController));

/**
 * @swagger
 * /workspaces/{workspaceId}:
 *   put:
 *     tags: [Workspaces]
 *     summary: Update workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 */
router.put('/workspaces/:workspaceId', workspaceController.updateWorkspace.bind(workspaceController));

/**
 * @swagger
 * /workspaces/{workspaceId}:
 *   delete:
 *     tags: [Workspaces]
 *     summary: Delete workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 */
router.delete('/workspaces/:workspaceId', workspaceController.deleteWorkspace.bind(workspaceController));

export default router;
