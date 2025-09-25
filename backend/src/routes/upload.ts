import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { db } from '../database/connection';
import { wrapError } from '../utils/errorHandling';
import { logger } from '../utils/logger';

const router = express.Router();

// File upload configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed',
];

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    logger.info(`Created upload directory: ${UPLOAD_DIR}`);
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    const { companyId } = req.user!;
    const companyDir = path.join(UPLOAD_DIR, companyId);
    
    try {
      await fs.access(companyDir);
    } catch {
      await fs.mkdir(companyDir, { recursive: true });
    }
    
    cb(null, companyDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Max 10 files per request
  },
});

// Validation schemas
const documentMetadataSchema = z.object({
  body: z.object({
    projectId: z.string().uuid().optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    category: z.enum(['PLANS', 'CONTRACTS', 'PERMITS', 'PHOTOS', 'REPORTS', 'INVOICES', 'CERTIFICATES', 'OTHER']).default('OTHER'),
    tags: z.array(z.string().max(50)).optional(),
    isPublic: z.boolean().default(false),
  }),
});

const fileParamsSchema = z.object({
  params: z.object({
    fileId: z.string().uuid(),
  }),
});

// Helper function to get file category from mimetype
const getCategoryFromMimeType = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'PHOTOS';
  if (mimetype === 'application/pdf') return 'REPORTS';
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'REPORTS';
  if (mimetype.includes('document') || mimetype.includes('word')) return 'CONTRACTS';
  return 'OTHER';
};

// POST /api/upload/files - Upload multiple files
router.post('/files', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const { companyId, id: userId } = req.user!;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { projectId, category = 'OTHER', tags = [], isPublic = false } = req.body;

    // Validate project if provided
    if (projectId) {
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          companyId,
        },
      });

      if (!project) {
        return res.status(400).json({ error: 'Invalid project selected' });
      }
    }

    const uploadedFiles = [];

    for (const file of files) {
      const fileCategory = category !== 'OTHER' ? category : getCategoryFromMimeType(file.mimetype);
      
      const document = await db.document.create({
        data: {
          filename: file.originalname,
          storedFilename: file.filename,
          filepath: file.path,
          mimetype: file.mimetype,
          size: file.size,
          category: fileCategory,
          projectId,
          uploadedById: userId,
          companyId,
          tags,
          isPublic,
          title: req.body.title || file.originalname,
          description: req.body.description,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      uploadedFiles.push(document);
    }

    logger.info(`${files.length} files uploaded by user ${userId}`);
    res.status(201).json({
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    logger.error('Error uploading files:', wrapError(error));
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// GET /api/upload/files - List documents
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { companyId, role } = req.user!;
    const { 
      projectId, 
      category, 
      search, 
      tags,
      page = '1', 
      limit = '20' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {
      companyId,
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    if (category) {
      whereClause.category = category;
    }

    if (tags && typeof tags === 'string') {
      const tagArray = tags.split(',').map(tag => tag.trim());
      whereClause.tags = {
        hasSome: tagArray,
      };
    }

    const documents = await db.document.findMany({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { filename: { contains: search as string, mode: 'insensitive' } },
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      skip: offset,
      take: limitNum,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await db.document.count({
      where: {
        ...whereClause,
        ...(search && {
          OR: [
            { filename: { contains: search as string, mode: 'insensitive' } },
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
    });

    // Calculate storage statistics
    const totalSizeResult = await db.document.aggregate({
      where: whereClause,
      _sum: {
        size: true,
      },
    });

    const categoryStats = await db.document.groupBy({
      by: ['category'],
      where: whereClause,
      _count: {
        category: true,
      },
      _sum: {
        size: true,
      },
    });

    res.json({
      documents: documents.map(doc => ({
        ...doc,
        url: `/api/upload/files/${doc.id}/download`,
        thumbnailUrl: doc.mimetype.startsWith('image/') ? `/api/upload/files/${doc.id}/thumbnail` : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      statistics: {
        totalSize: totalSizeResult._sum.size || 0,
        totalFiles: total,
        categoryBreakdown: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.category,
          size: stat._sum.size || 0,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching documents:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/upload/files/:fileId - Get document details
router.get('/files/:fileId', authenticateToken, validateRequest(fileParamsSchema), async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { fileId } = req.params;

    const document = await db.document.findFirst({
      where: {
        id: fileId,
        companyId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      ...document,
      url: `/api/upload/files/${document.id}/download`,
      thumbnailUrl: document.mimetype.startsWith('image/') ? `/api/upload/files/${document.id}/thumbnail` : null,
    });
  } catch (error) {
    logger.error('Error fetching document:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// GET /api/upload/files/:fileId/download - Download file
router.get('/files/:fileId/download', authenticateToken, validateRequest(fileParamsSchema), async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { fileId } = req.params;

    const document = await db.document.findFirst({
      where: {
        id: fileId,
        companyId,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file exists on disk
    try {
      await fs.access(document.filepath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Update download count
    await db.document.update({
      where: { id: fileId },
      data: {
        downloadCount: {
          increment: 1,
        },
        lastAccessedAt: new Date(),
      },
    });

    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.setHeader('Content-Type', document.mimetype);
    res.sendFile(path.resolve(document.filepath));
  } catch (error) {
    logger.error('Error downloading file:', wrapError(error));
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// PUT /api/upload/files/:fileId - Update document metadata
router.put('/files/:fileId', authenticateToken, validateRequest({ 
  ...fileParamsSchema,
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    category: z.enum(['PLANS', 'CONTRACTS', 'PERMITS', 'PHOTOS', 'REPORTS', 'INVOICES', 'CERTIFICATES', 'OTHER']).optional(),
    tags: z.array(z.string().max(50)).optional(),
    isPublic: z.boolean().optional(),
  }),
}), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { fileId } = req.params;

    const existingDocument = await db.document.findFirst({
      where: {
        id: fileId,
        companyId,
      },
    });

    if (!existingDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions - uploader or managers can edit
    if (existingDocument.uploadedById !== userId && !['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to update this document' });
    }

    const updateData: any = {};
    const { title, description, category, tags, isPublic } = req.body;

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const document = await db.document.update({
      where: { id: fileId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Document updated: ${document.id} by user ${userId}`);
    res.json({
      ...document,
      url: `/api/upload/files/${document.id}/download`,
      thumbnailUrl: document.mimetype.startsWith('image/') ? `/api/upload/files/${document.id}/thumbnail` : null,
    });
  } catch (error) {
    logger.error('Error updating document:', wrapError(error));
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/upload/files/:fileId - Delete document
router.delete('/files/:fileId', authenticateToken, validateRequest(fileParamsSchema), async (req, res) => {
  try {
    const { companyId, id: userId, role } = req.user!;
    const { fileId } = req.params;

    const existingDocument = await db.document.findFirst({
      where: {
        id: fileId,
        companyId,
      },
    });

    if (!existingDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions - uploader or managers can delete
    if (existingDocument.uploadedById !== userId && !['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete this document' });
    }

    // Delete file from disk
    try {
      await fs.unlink(existingDocument.filepath);
    } catch (error) {
      logger.warn(`Failed to delete file from disk: ${existingDocument.filepath}`);
    }

    // Delete from database
    await db.document.delete({
      where: { id: fileId },
    });

    logger.info(`Document deleted: ${fileId} by user ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting document:', wrapError(error));
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// GET /api/upload/storage-stats - Get storage statistics
router.get('/storage-stats', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user!;
    const { projectId } = req.query;

    const whereClause: any = {
      companyId,
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    const totalStats = await db.document.aggregate({
      where: whereClause,
      _sum: {
        size: true,
        downloadCount: true,
      },
      _count: {
        id: true,
      },
    });

    const categoryStats = await db.document.groupBy({
      by: ['category'],
      where: whereClause,
      _count: {
        category: true,
      },
      _sum: {
        size: true,
      },
    });

    const recentUploads = await db.document.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const popularFiles = await db.document.findMany({
      where: {
        ...whereClause,
        downloadCount: {
          gt: 0,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        downloadCount: 'desc',
      },
      take: 10,
    });

    res.json({
      overview: {
        totalFiles: totalStats._count.id || 0,
        totalSize: totalStats._sum.size || 0,
        totalDownloads: totalStats._sum.downloadCount || 0,
        averageFileSize: totalStats._count.id > 0 
          ? Math.round((totalStats._sum.size || 0) / totalStats._count.id) 
          : 0,
      },
      categoryBreakdown: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.category,
        size: stat._sum.size || 0,
        percentage: totalStats._sum.size > 0 
          ? Math.round(((stat._sum.size || 0) / totalStats._sum.size) * 100) 
          : 0,
      })),
      recentUploads: recentUploads.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        title: doc.title,
        category: doc.category,
        size: doc.size,
        createdAt: doc.createdAt,
        project: doc.project,
        uploadedBy: `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`,
      })),
      popularFiles: popularFiles.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        title: doc.title,
        category: doc.category,
        downloadCount: doc.downloadCount,
        project: doc.project,
      })),
    });
  } catch (error) {
    logger.error('Error fetching storage stats:', wrapError(error));
    res.status(500).json({ error: 'Failed to fetch storage statistics' });
  }
});

export default router;