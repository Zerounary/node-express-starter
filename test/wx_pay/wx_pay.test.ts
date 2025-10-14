import { assert } from "chai";
import sinon from "sinon";
import axios from "axios";
import { sendRedPacket } from "../../src/utils/wx/redpack";

describe("Utils", function () {
  describe("wx_pay", function () {
    // Restore sinon stubs after each test
    afterEach(function () {
      sinon.restore();
    });

    it("红包发送-real mmpaymkttransfers/sendredpack ", async function () {
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

    it("红包发送成功 mmpaymkttransfers/sendredpack", async function () {
      const params = {
        mch_billno: `test${Date.now()}`, // 商户订单号 (use unique value for tests)
        send_name: "test1", // 商户名称
        re_openid: "oarAv51ohZCvemFDyDIiRerCVRk4", // 用户openid
        total_amount: 100, // 付款金额，单位分
        total_num: 1, // 红包发放总人数
        wishing: "test2", // 红包祝福语
        client_ip: "125.68.140.23",
        act_name: "test12", // 活动名称
        remark: "test33", // 备注
      };

      const successXmlResponse = `
        <xml>
          <return_code><![CDATA[SUCCESS]]></return_code>
          <return_msg><![CDATA[发放成功]]></return_msg>
          <result_code><![CDATA[SUCCESS]]></result_code>
          <mch_billno><![CDATA[${params.mch_billno}]]></mch_billno>
          <mch_id><![CDATA[1498998302]]></mch_id>
          <wxappid><![CDATA[wx72638e25f4a37963]]></wxappid>
          <re_openid><![CDATA[${params.re_openid}]]></re_openid>
          <total_amount><![CDATA[${params.total_amount}]]></total_amount>
          <send_listid><![CDATA[1000000000201505203147660742]]></send_listid>
        </xml>
      `;

      // Mock axios.post to simulate a successful API call from WeChat
      sinon.stub(axios, "post").resolves({
        status: 200,
        data: successXmlResponse,
      });

      const res = await sendRedPacket(params);

      assert.isTrue(res.success, "Expected success to be true");
      assert.strictEqual(res.data?.return_code, "SUCCESS", "Expected return_code to be SUCCESS");
      assert.strictEqual(res.data?.result_code, "SUCCESS", "Expected result_code to be SUCCESS");
      assert.strictEqual(res.data?.return_msg, "发放成功", "Expected return_msg to be '发放成功'");
    });

    it("红包发送失败 - 签名错误", async function () {
      const params = {
        mch_billno: `test${Date.now()}`,
        send_name: "test1",
        re_openid: "oarAv51ohZCvemFDyDIiRerCVRk4",
        total_amount: 100,
        total_num: 1,
        wishing: "test2",
        client_ip: "125.68.140.23",
        act_name: "test12",
        remark: "test33",
      };

      const failureXmlResponse = `
        <xml>
          <return_code><![CDATA[FAIL]]></return_code>
          <return_msg><![CDATA[签名错误]]></return_msg>
          <result_code><![CDATA[FAIL]]></result_code>
          <err_code><![CDATA[SIGNERROR]]></err_code>
          <err_code_des><![CDATA[签名错误]]></err_code_des>
        </xml>
      `;

      // Mock axios.post to simulate a failed API call from WeChat
      sinon.stub(axios, "post").resolves({
        status: 200,
        data: failureXmlResponse,
      });

      const res = await sendRedPacket(params);

      assert.isFalse(res.success, "Expected success to be false");
      assert.strictEqual(res.error?.err_code, "SIGNERROR", "Expected error code to be SIGNERROR");
      assert.strictEqual(res.error?.return_msg, "签名错误", "Expected return_msg to be '签名错误'");
    });
  });
});