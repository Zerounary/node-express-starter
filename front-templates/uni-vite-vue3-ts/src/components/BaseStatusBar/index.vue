<template>
	<view :style="{ height: statusBarHeight, 'background-color': themeBgColor }" class="uni-status-bar">
		<slot />
	</view>
</template>

<script>
	export default {
		name: 'UniStatusBar',
		props: {
			dark: {
				type: Boolean,
				default: false
			},
			backgroundColor: {
				type: String,
				default: ""
			},
		},
		data() {
			return {
				statusBarHeight: 20
			}
		},
		mounted() {
			this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight + 'px'
		},
		computed: {
			themeBgColor() {
				if (this.dark) {
					// 默认值
					if (this.backgroundColor) {
						return this.backgroundColor
					} else {
						return this.dark ? '#333' : '#FFF'
					}
				}
				return this.backgroundColor || '#FFF'
			},
		},
	}
</script>

<style lang="scss" >
	.uni-status-bar {
		// width: 750rpx;
		height: 20px;
		// height: var(--status-bar-height);
	}
</style>
