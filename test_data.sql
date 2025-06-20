-- ===================================================================================
-- ========================= 三元宇宙 Discord 机器人测试数据脚本 =======================
-- ===================================================================================
-- 此脚本用于创建测试用户和权限，方便测试 Discord 机器人的验证功能
-- ===================================================================================

-- 创建测试用户 1：拥有所有权限的用户
DO $$
DECLARE
    test_user_id UUID;
    xitong_perm_id UUID;
    gongfa_perm_id UUID;
    xinfa_perm_id UUID;
    zhenfa_perm_id UUID;
BEGIN
    -- 生成测试用户 UUID
    test_user_id := gen_random_uuid();
    
    -- 获取权限 ID
    SELECT id INTO xitong_perm_id FROM permissions WHERE slug = 'xitong';
    SELECT id INTO gongfa_perm_id FROM permissions WHERE slug = 'gongfa';
    SELECT id INTO xinfa_perm_id FROM permissions WHERE slug = 'xinfa';
    SELECT id INTO zhenfa_perm_id FROM permissions WHERE slug = 'zhenfa';
    
    -- 创建用户资料
    INSERT INTO user_profiles (id, email, nickname, created_at, updated_at)
    VALUES (
        test_user_id,
        'test1@sanyuan.com',
        '测试用户1',
        NOW(),
        NOW()
    );
    
    -- 创建权限：系统权限（永久）
    INSERT INTO user_permissions (user_id, permission_id, is_active, expires_at)
    VALUES (test_user_id, xitong_perm_id, true, NULL);
    
    -- 创建权限：功法权限（永久）
    INSERT INTO user_permissions (user_id, permission_id, is_active, expires_at)
    VALUES (test_user_id, gongfa_perm_id, true, NULL);
    
    -- 创建权限：心法权限（30天后过期）
    INSERT INTO user_permissions (user_id, permission_id, is_active, expires_at)
    VALUES (test_user_id, xinfa_perm_id, true, NOW() + INTERVAL '30 days');
    
    -- 创建权限：阵法权限（永久）
    INSERT INTO user_permissions (user_id, permission_id, is_active, expires_at)
    VALUES (test_user_id, zhenfa_perm_id, true, NULL);
    
    RAISE NOTICE '✅ 已创建测试用户1: test1@sanyuan.com（拥有所有权限）';
END $$;

-- 创建测试用户 2：仅有部分权限的用户
DO $$
DECLARE
    test_user_id UUID;
    xitong_perm_id UUID;
    xinfa_perm_id UUID;
BEGIN
    -- 生成测试用户 UUID
    test_user_id := gen_random_uuid();
    
    -- 获取权限 ID
    SELECT id INTO xitong_perm_id FROM permissions WHERE slug = 'xitong';
    SELECT id INTO xinfa_perm_id FROM permissions WHERE slug = 'xinfa';
    
    -- 创建用户资料
    INSERT INTO user_profiles (id, email, nickname, created_at, updated_at)
    VALUES (
        test_user_id,
        'test2@sanyuan.com',
        '测试用户2',
        NOW(),
        NOW()
    );
    
    -- 创建权限：系统权限（永久）
    INSERT INTO user_permissions (user_id, permission_id, is_active, expires_at)
    VALUES (test_user_id, xitong_perm_id, true, NULL);
    
    -- 创建权限：心法权限（7天后过期）
    INSERT INTO user_permissions (user_id, permission_id, is_active, expires_at)
    VALUES (test_user_id, xinfa_perm_id, true, NOW() + INTERVAL '7 days');
    
    RAISE NOTICE '✅ 已创建测试用户2: test2@sanyuan.com（仅有系统+心法权限）';
END $$;

-- 创建测试用户 3：拥有已过期权限的用户（用于测试过期检查）
DO $$
DECLARE
    test_user_id UUID;
    xinfa_perm_id UUID;
BEGIN
    -- 生成测试用户 UUID
    test_user_id := gen_random_uuid();
    
    -- 获取权限 ID
    SELECT id INTO xinfa_perm_id FROM permissions WHERE slug = 'xinfa';
    
    -- 创建用户资料
    INSERT INTO user_profiles (id, email, nickname, created_at, updated_at)
    VALUES (
        test_user_id,
        'test3@sanyuan.com',
        '测试用户3',
        NOW(),
        NOW()
    );
    
    -- 创建权限：心法权限（已过期）
    INSERT INTO user_permissions (user_id, permission_id, is_active, expires_at)
    VALUES (test_user_id, xinfa_perm_id, true, NOW() - INTERVAL '1 day');
    
    RAISE NOTICE '✅ 已创建测试用户3: test3@sanyuan.com（拥有已过期的心法权限）';
END $$;

-- 查看创建的测试数据
SELECT 
    'test_users' as table_name,
    count(*) as total_count
FROM user_profiles 
WHERE email LIKE 'test%@sanyuan.com'

UNION ALL

SELECT 
    'test_permissions' as table_name,
    count(*) as total_count
FROM user_permissions up
JOIN user_profiles prof ON up.user_id = prof.id
WHERE prof.email LIKE 'test%@sanyuan.com';

-- 显示详细的测试用户信息
SELECT 
    prof.email,
    prof.nickname,
    perm.slug as permission,
    perm.name as permission_name,
    up.is_active,
    up.expires_at,
    CASE 
        WHEN up.expires_at IS NULL THEN '永久'
        WHEN up.expires_at > NOW() THEN '有效'
        ELSE '已过期'
    END as status
FROM user_profiles prof
JOIN user_permissions up ON prof.id = up.user_id
JOIN permissions perm ON up.permission_id = perm.id
WHERE prof.email LIKE 'test%@sanyuan.com'
ORDER BY prof.email, perm.slug;

-- 完成提示
SELECT '🎯 测试数据创建完成！现在可以使用以下邮箱进行 Discord 验证测试：' as message
UNION ALL
SELECT '   • test1@sanyuan.com - 拥有全部权限（心法权限30天后过期）'
UNION ALL
SELECT '   • test2@sanyuan.com - 拥有系统+心法权限（心法权限7天后过期）'
UNION ALL
SELECT '   • test3@sanyuan.com - 拥有已过期的心法权限（用于测试过期检查）'; 