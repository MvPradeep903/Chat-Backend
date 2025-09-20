const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const createToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
const register = async (req, res) => {
    try {
        let { username, phoneNumber, email, password } = req.body;
        const normalizedPhone = phoneNumber?.trim();
        const normalizedEmail = email?.toLowerCase().trim();
        console.log("avatar", req.file);
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const url = `${req.protocol}://${req.get('host')}/uploads/${path.basename(req.file.destination)}/${req.file.filename}`;

        if (!username || !normalizedPhone || !password) { return res.status(400).json({ message: 'Missing Fields' }) }
        const existingPhone = await User.findOne({ phoneNumber: normalizedPhone });
        if (existingPhone) {
            return res.status(400).json({ message: 'Phone number already in use' });
        }

        if (normalizedEmail) {
            const existingEmail = await User.findOne({ email: normalizedEmail });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        // const existing = await User.findOne({ email : normalizedEmail });

        // if (existing) { return res.status(400).json({ message : 'Email already in use'}) }

        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ username, phoneNumber: normalizedPhone, email: normalizedEmail || null, password: hashed, avatar: url || undefined });
        await user.save();

        const token = createToken(user._id);
        const usersafe = {
            id: user._id,
            username: user.username,
            phoneNumber: user.phoneNumber,
            email: user.email, avatar: user.avatar
        };

        res.status(201).json({ user: usersafe, token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const login = async (req, res) => {
    try {
        let { phoneNumber, password } = req.body;
        const normalizedPhone = phoneNumber?.trim();
        // const normalizedEmail = email?.toLowerCase().trim();
        // if ( !normalizedEmail || !password ) { return res.status(400).json({ message : 'Missing Fields' }) }
        if (!normalizedPhone || !password) {
            return res.status(400).json({ message: 'Missing Fields' });
        }
        const user = await User.findOne({ phoneNumber: normalizedPhone });
        if (!user) { return res.status(401).json({ message: 'Invalid Credentials' }) }

        const matched = await bcrypt.compare(password, user.password);
        if (!matched) { return res.status(401).json({ message: 'Invalid Credentials' }) }

        const token = createToken(user._id);
        const usersafe = {
            id: user._id,
            username: user.username,
            phoneNumber: user.phoneNumber,
            email: user.email, avatar: user.avatar, aboutme: user.aboutme
        };

        res.json({ user: usersafe, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

module.exports = { register, login };