function publicUser(user) {
  if (!user) return null;
  const { password, passwordHash, ...safe } = user;
  void password;
  void passwordHash;
  return safe;
}

module.exports = { publicUser };
