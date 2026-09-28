import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_key_marketboard_2026', {
    expiresIn: '30d',
  });
};

export default generateToken;
