-- ===================================================================================
-- ======================== 三元宇宙项目 - Discord 集成数据库更新脚本 ==================
-- ===================================================================================
-- 此脚本用于添加 Discord 用户ID 字段，以支持自动化权限管理功能
-- ===================================================================================

-- 为 user_permissions 表添加 discord_user_id 字段
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- 为新字段添加注释
COMMENT ON COLUMN public.user_permissions.discord_user_id IS 'Discord 用户ID，用于权限管理和角色分配';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_permissions_discord_user_id 
ON public.user_permissions(discord_user_id);

-- 创建索引以提高过期权限查询性能
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires_at 
ON public.user_permissions(expires_at) 
WHERE expires_at IS NOT NULL AND is_active = true;

-- 创建复合索引用于权限过期检查
CREATE INDEX IF NOT EXISTS idx_user_permissions_expiry_check 
ON public.user_permissions(is_active, expires_at, discord_user_id)
WHERE is_active = true;

-- 更新 RLS 策略以包含新的字段
-- （现有的策略已经覆盖了新字段，无需额外修改）

-- 添加一个函数来清理无效的Discord用户关联（可选）
CREATE OR REPLACE FUNCTION public.cleanup_invalid_discord_associations()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- 清理无效的discord_user_id（如果需要的话）
    -- 这里可以添加逻辑来验证Discord用户ID的有效性
    
    -- 返回清理的记录数
    RETURN cleanup_count;
END;
$$;
COMMENT ON FUNCTION public.cleanup_invalid_discord_associations IS '清理无效的Discord用户关联';

-- 创建一个视图用于监控权限过期情况
CREATE OR REPLACE VIEW public.view_expiring_permissions AS
SELECT 
    up.id,
    up.user_id,
    up.discord_user_id,
    up.expires_at,
    up.is_active,
    prof.email,
    prof.nickname,
    perm.slug as permission_slug,
    perm.name as permission_name,
    CASE 
        WHEN up.expires_at IS NULL THEN '永久'
        WHEN up.expires_at > NOW() THEN '有效'
        ELSE '已过期'
    END as status,
    CASE 
        WHEN up.expires_at IS NOT NULL AND up.expires_at > NOW() THEN
            EXTRACT(days FROM up.expires_at - NOW())
        ELSE NULL
    END as days_until_expiry
FROM public.user_permissions up
JOIN public.user_profiles prof ON up.user_id = prof.id
JOIN public.permissions perm ON up.permission_id = perm.id
WHERE up.is_active = true
ORDER BY up.expires_at ASC NULLS LAST;

COMMENT ON VIEW public.view_expiring_permissions IS '权限过期监控视图';

-- 视图会继承底层表的 RLS 策略，无需单独设置
-- 授予权限给已认证用户
GRANT SELECT ON public.view_expiring_permissions TO authenticated;

-- 完成提示
SELECT 'Discord 集成数据库更新完成！已添加 discord_user_id 字段和相关索引。' as message; 