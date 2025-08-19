import User from "../models/User";

export const getUserPerms = async (userId: number) => {
    const user = await User.findByPk(userId);
    if(!user) return []
    const roles = await user.getRoles();
    let permissions = [];
    for(let role of roles) {
      const perms = await role.getPermissions();
      permissions = permissions.concat(perms.map(p => p.action));
    }
    return permissions;
}