import { Router } from "express";
import { User } from "../models/User";
import jwt from 'jsonwebtoken';

const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User exists' });

    const user = new User({ email, passwordHash: password });
    await user.save();
    res.status(201).json({ userId: user._id, email: user.email });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, userId: user._id });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default authRouter;