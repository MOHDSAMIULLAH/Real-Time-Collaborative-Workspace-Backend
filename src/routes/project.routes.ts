import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project
 *     security:
 *       - bearerAuth: []
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate(createProjectSchema), projectController.createProject.bind(projectController));

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     tags: [Projects]
 *     summary: Get all user projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *       401:
 *         description: Unauthorized
 */
router.get('/', projectController.getProjects.bind(projectController));

/**
 * @swagger
 * /api/v1/projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID
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
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get('/:projectId', projectController.getProject.bind(projectController));

/**
 * @swagger
 * /api/v1/projects/{projectId}:
 *   put:
 *     tags: [Projects]
 *     summary: Update project
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.put(
  '/:projectId',
  validate(updateProjectSchema),
  projectController.updateProject.bind(projectController)
);

/**
 * @swagger
 * /api/v1/projects/{projectId}:
 *   delete:
 *     tags: [Projects]
 *     summary: Delete project
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
 *         description: Project deleted successfully
 */
router.delete('/:projectId', projectController.deleteProject.bind(projectController));

// Project members routes
router.get('/:projectId/members', projectController.getMembers.bind(projectController));
router.post(
  '/:projectId/members',
  validate(inviteMemberSchema),
  projectController.inviteMember.bind(projectController)
);
router.put(
  '/:projectId/members/:memberId',
  validate(updateMemberRoleSchema),
  projectController.updateMemberRole.bind(projectController)
);
router.delete('/:projectId/members/:memberId', projectController.removeMember.bind(projectController));

export default router;
