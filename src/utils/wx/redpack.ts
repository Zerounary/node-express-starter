import { postV2, wxPayConfig } from './common';

interface SendRedPacketParams {
  mch_billno: string;      // 商户订单号 (商户侧唯一)
  send_name: string;       // 商户名称
  re_openid: string;       // 接收红包的用户openid
  total_amount: number;    // 付款金额，单位为分
  total_num: number;       // 红包发放总人数，普通红包固定为1
  wishing: string;         // 红包祝福语
  client_ip: string;       // 调用接口的机器Ip地址
  act_name: string;        // 活动名称
  remark: string;          // 备注信息
  scene_id?: string;      // 场景id，非必填
}

/**
 * 发送微信支付普通现金红包
 * @param params 红包参数
 * @returns 微信支付接口返回的结果
 */
export async function sendRedPacket(params: SendRedPacketParams) {
    const requestParams = {
        ...params,
        wxappid: wxPayConfig.appid, // Red packet API uses `wxappid`
    };
    return await postV2('mmpaymkttransfers/sendredpack', requestParams, true);
}