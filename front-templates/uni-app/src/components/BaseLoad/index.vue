<template>
  <view v-if="show === 'loading'">
    <slot name="loading">
      <view v-if="mode === 'page'" class="page">
        <van-loading type="spinner" color="#008eff" />
      </view>
      <view v-if="mode === 'module'" class="module">
        <van-loading type="spinner" color="#008eff" />
      </view>
    </slot>
  </view>
  <view v-else-if="show === 'error'">
    <slot name="error">
      <view v-if="mode === 'page'" class="page"> 哇喔，加载发生异常 </view>
      <view v-if="mode === 'module'" class="module"> 哇喔，加载发生异常 </view>
    </slot>
  </view>
  <view v-else>
    <slot>
      <view v-if="mode === 'page'" class="page"> 请设置页面内容 </view>
      <view v-if="mode === 'module'" class="module"> 请设置模块内容 </view>
    </slot>
  </view>
</template>
<script setup lang="ts">
import { ref,onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app';

/*
1，引入
<BaseLoad>
  ...  
</BaseLoad>
2，参数
filters: 加载过滤数组
auth：是否验证登录和全局配置获取，默认为true；
mode: 模式，非必填，枚举：page,module，默认值:page；
autoPerform：是否自动执行，非必填，当mode=page时，autoPerform默认为true,mode=module时，autoPerform默认为false；当autoPerform为false时，需要调用组件暴露的perform方法手动触发加载
3，事件
error：加载失败回调，非必填
success: 加载成功回调，非必填；
4，插槽
#default：内容插槽
#loading：加载遮罩插槽
#error：加载失败插槽
5，使用样例
<template>
  <BaseLoad name='father' :filters='filters' @error='error' @success='success'>
    ...  
    <BaseLoad name='child' :filters='...' ref='child'>
      ...
    </BaseLoad>
  </BaseLoad>
</template>
<script setup lang='ts'>
  import { ref } from 'vue'
  const f1 = (ctx)=>{return new Promise((resolve,reject) => {...})} //filters数组元素是返回Promise对象的方法。ctx是整个加载流程的上下文，可用于存储阶段数据，实现复杂加载流程
  const f2 = ...
  const f3 = ...
  const filters = [f1,f2,f3] //三个方法串行完成后加载完成
  const filters2 = [[f1,f2],f3] //f1,f2并行完成后执行f3
  const filters3 = ['config',f1] //login和config是内置的方法，根据项目可将常用的方法内置到组件中
  const filters4 = [ //对于复杂需求，可使用对象进行详细配置
    {
      msg:'', //预留字段，用于展示加载阶段展示信息
      execute:f1|'login'|[f1,f2], //加载执行的方法
      success:f1|'login'|[f1,f2], //成功加载后执行的流程
      error: ()=>{} //失败回调，相对于全局回调，可根据加载流程进行不同处理
    }
  ]
  const filters5 = ['config:activity'] //内置方法可以携带参数。在config内置方法中通过上下文ctx.config可获取到参数activity
  const error = () => { //加载失败后（既某个流程reject方法被调用）会先调用此方法，然后再移除页面的加载"遮罩"
    $goto(...)
  }
  const child = ref();  //获取子加载组件引用
  const success = () => { //父加载组件加载完成后，再开始子组件加载流程 
    child.perform()
  }
<script>
*/

let show = ref('loading')
let props = defineProps({
  filters: {
    type: Array,
    default: [],
  },
  mode: {
    type: String,
    default: 'page',
  },
  auth: {
    type: Boolean,
    default: true,
  },
  autoPerform: {
    type: Boolean,
    default: null,
  },
})
const emit = defineEmits(['success', 'error'])

const { mode, auth } = props
let filters = props.filters?['grid',...props.filters]:['grid']
const initProps = () => {
  let autoPerform = props.autoPerform
  if (autoPerform === null) {
    if (mode === 'page') autoPerform = true
    else autoPerform = false
  }
  return { autoPerform }
}
const { autoPerform } = initProps()

const ctx: any = {}
const execute: any = (i: number) => {
  if (filters.length <= i) {
    emit('success')
    show.value = 'content'
  } else {
    const filter = filters[i]
    executeFilter(filter, () => {
      execute(i + 1)
    })
  }
}

const executeFilter = (filter: any, success: any, error: any = null) => {
  if (typeof filter === 'function') {
    filter(ctx)
      .then(() => {
        success()
      })
      .catch((e: any) => {
        executeFaild(error, e)
      })
  } else if (typeof filter === 'string') {
    let strs = filter.split(':')
    if (strs.length > 1) ctx[strs[0]] = strs[1]
    executeFilter(customFilters[strs[0]], success)
  } else {
    if (filter instanceof Array) {
      let finishNum = 0
      for (let f of filter) {
        executeFilter(f, () => {
          finishNum++
          if (finishNum === filter.length) {
            success()
          }
        })
      }
    } else if (filter instanceof Object) {
      if (filter instanceof Promise) {
        executeFilter(()=>{return filter},success,error)
      } else {
        executeFilter(
          filter.filter,
          filter.success
            ? () => {
                executeFilter(filter.success, success)
              }
            : success,
          filter.error
        )
      }
    }
  }
}

const executeFaild = (f: any, error: any) => {
  if (f) {
    f(error)
  } else {
    emit('error')
  }
  show.value = 'error'
}

//内置过滤器
let grid:any = null;
let customFilters: any = {
  config: (ctx: any) => {
    console.log('🚀 ~ file: index.vue:184 ~ ctx:', ctx)
  },
}

const perform = () => {
  if (auth === true) {
    //执行登录成功判断逻辑
    execute(0)
    // let login: boolean = personStore.userInfo ? true : false
    // let config: boolean = configStore.config ? true : false
    // if (login && config) {
    //   execute(0)
    // } else {
    //   if (!login) {
    //     personStore.loginSuccess.push(() => {
    //       login = true
    //       if (login && config) execute(0)
    //     })
    //   }
    //   if (!config) {
    //     configStore.configSuccess.push(() => {
    //       config = true
    //       if (login && config) execute(0)
    //     })
    //   }
    // }
  } else {
    execute(0)
  }
}

//抛出执行方法，当组件是子组件模式时，需要手动调用执行方法
defineExpose({
  perform,
})
onLoad((option) => {
  grid = option?.grid_id
})
//执行
onMounted(() => {
  if (autoPerform === true) perform()
})
</script>
<style>
.page {
  @apply h-screen flex items-center justify-center;
}
.module {
  @apply w-full h-full flex items-center justify-center;
}
</style>
