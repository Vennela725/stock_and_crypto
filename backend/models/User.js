import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['investor', 'admin'], default: 'investor' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  cashBalance: { type: Number, default: 50000, min: 0 },
}, { timestamps: true, toJSON: { virtuals: true } });

userSchema.virtual('id').get(function id() { return this._id.toString(); });
userSchema.set('toJSON', {
  transform: (_doc, value) => {
    delete value.passwordHash;
    delete value.__v;
    return value;
  }
});

// Compare entered password with hashed password in DB
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

export default mongoose.model('User', userSchema);
