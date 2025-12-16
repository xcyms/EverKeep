// src/types/index.d.ts

/**
 * @description 用户信息接口
 */
export interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string; // 可选的用户头像
  roles: string[]; // 用户角色列表
}
