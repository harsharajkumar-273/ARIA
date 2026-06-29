import { Router, Request, Response } from 'express';
import { pool } from '../config';

const router = Router();

// POST /api/verify/id - Mock ID document extraction
router.post('/verify/id', async (req: Request, res: Response) => {
  const { userId, idImageBase64 } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  try {
    // Simulate Claude Vision processing of ID card
    console.log(`📸 Simulating ID processing for user ${userId}...`);
    
    // Update user: ID Verified, increment trust tier
    await pool.query(
      `
      UPDATE users
      SET is_id_verified = true,
          trust_tier = LEAST(trust_tier + 1, 4)
      WHERE id = $1
      `,
      [userId]
    );

    res.json({
      status: 'success',
      extractedData: {
        name: 'Maria K.',
        documentType: 'Driver License',
        expiryDate: '2030-12-31'
      },
      message: 'ID document verified successfully. Trust tier increased.'
    });
  } catch (error: any) {
    console.error('ID verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/verify/face - Mock Selfie Face comparison
router.post('/verify/face', async (req: Request, res: Response) => {
  const { userId, selfieImageBase64 } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  try {
    console.log(`📸 Simulating biometric face-match for user ${userId}...`);

    // Update user: Face verified, increment trust tier
    await pool.query(
      `
      UPDATE users
      SET is_face_verified = true,
          trust_tier = LEAST(trust_tier + 1, 4)
      WHERE id = $1
      `,
      [userId]
    );

    res.json({
      status: 'success',
      confidenceScore: 0.98,
      message: 'Face verification matches ID document. Trust tier increased.'
    });
  } catch (error: any) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
