// 测试 Supabase Storage 连接
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://pscappeeldsrmzjwwipk.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_dyLT7gqLQedKGr_CpuV28w_tFIi5NOu'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testStorage() {
  console.log('=== 测试 Supabase Storage ===\n')

  // 1. 列出所有存储桶
  console.log('1. 获取存储桶列表...')
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    console.error('❌ 获取存储桶列表失败:', bucketsError)
  } else {
    console.log('✅ 存储桶列表:', buckets.map(b => b.name))
  }

  // 2. 测试上传到 "our Europe memories"
  console.log('\n2. 测试上传到 "our Europe memories"...')

  // 创建一个测试文件
  const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
  const testFilePath = `test/${Date.now()}-test.txt`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('our Europe memories')
    .upload(testFilePath, testFile)

  if (uploadError) {
    console.error('❌ 上传失败:', uploadError.message)
    console.error('   错误详情:', {
      statusCode: uploadError.statusCode,
      name: uploadError.name
    })
  } else {
    console.log('✅ 上传成功:', uploadData)

    // 3. 测试获取公共 URL
    console.log('\n3. 测试获取公共 URL...')
    const { data: urlData } = supabase.storage
      .from('our Europe memories')
      .getPublicUrl(testFilePath)
    console.log('✅ 公共 URL:', urlData.publicUrl)

    // 4. 删除测试文件
    console.log('\n4. 删除测试文件...')
    const { error: deleteError } = await supabase.storage
      .from('our Europe memories')
      .remove([testFilePath])

    if (deleteError) {
      console.error('❌ 删除失败:', deleteError.message)
    } else {
      console.log('✅ 删除成功')
    }
  }

  // 5. 测试数据库权限
  console.log('\n5. 测试数据库读取权限...')
  const { data: memories, error: dbError } = await supabase
    .from('memories')
    .select('*')
    .limit(1)

  if (dbError) {
    console.error('❌ 数据库读取失败:', dbError.message)
  } else {
    console.log('✅ 数据库读取成功，找到', memories?.length || 0, '条记录')
  }
}

testStorage().catch(console.error)
