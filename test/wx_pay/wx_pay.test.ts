import assert from "assert";
import { orderquery, sendredpack } from "../../src/utils/wx_pay";
import { sendRedPacket } from "../../src/utils/wx/redpack";

describe("Utils", function () {
  describe("wx_pay", function () {
    // it("订单查询 pay/orderquery", async function () {
    //   let res = await orderquery({
    //     out_trade_no: "202211011033512e3d8cbba3d240", // 商户订单号
    //   });
    //   console.log("🚀 ~ req:", res?.toObject());
    // });
    it("红包发送 mmpaymkttransfers/sendredpack", async function () {
      let res = await sendRedPacket({
        mch_billno: "202519131733512e3d8cbba3d240", // 商户订单号
        send_name: "test1", // 商户名称
        re_openid: "oarAv51ohZCvemFDyDIiRerCVRk4", // 用户openid
        total_amount: 100, // 付款金额，单位分
        total_num: 1, // 红包发放总人数
        wishing: "test2", // 红包祝福语
        client_ip: "125.68.140.23",
        act_name: "test12", // 活动名称
        remark: "test33", // 备注
      });
      assert.equal(res.success, true);
      assert.equal(res.data?.return_code, "SUCCESS");
      assert.equal(res.data?.return_msg, "发放成功");
    });
  });
});
