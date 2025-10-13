import assert from "assert";
import {orderquery, sendredpack } from "../src/utils/wx_pay";

describe("Utils", function () {
  describe("wx_pay", function () {
    it("订单查询 pay/orderquery", async function () {
      let res = await orderquery({
        out_trade_no: "202211011033512e3d8cbba3d240", // 商户订单号
      });
      console.log("🚀 ~ req:", res?.toObject());
    });
    it("红包发送 mmpaymkttransfers/sendredpack", async function () {
      let res = await sendredpack({
        mch_billno: "202519131733512e3d8cbba3d240", // 商户订单号
        send_name: "测试商户", // 商户名称
        re_openid: "oarAv51ohZCvemFDyDIiRerCVRk4", // 用户openid
        total_amount: 100, // 付款金额，单位分
        total_num: 1, // 红包发放总人数
        wishing: "新年活动！", // 红包祝福语
        client_ip: "",
        act_name: "接口测试1", // 活动名称
        remark: "接口测试2", // 备注
      });
      console.log("🚀 ~ req:", res?.toObject());
    });
  });
});
