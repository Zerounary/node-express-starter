import { assert } from "chai";
import sinon from "sinon";
import axios from "axios";
import { WxPayV2, wxPayConfig } from "../../src/utils/wx/common";

describe("Utils", function () {
  describe("wx_pay", function () {
    afterEach(function () {
      sinon.restore();
    });

    describe("WxPayV2 class", function () {
      it("红包发送-real", async function () {
        const wxPay = new WxPayV2(wxPayConfig);
        let res = await wxPay.sendRedPacket({
          mch_billno: "202519131733512e3d8cbba3d240", // 商户订单号
          re_openid: "oarAv51ohZCvemFDyDIiRerCVRk4", // 用户openid
          total_amount: 100, // 付款金额，单位分
        });
        assert.equal(res.success, true);
        assert.equal(res.data?.return_code, "SUCCESS");
        assert.equal(res.data?.return_msg, "发放成功");
      });
      it("should make a successful post request", async function () {
        const customConfig = { ...wxPayConfig, key: "mockKey" };
        const wxPay = new WxPayV2(customConfig);

        const successXmlResponse = `
          <xml>
            <return_code><![CDATA[SUCCESS]]></return_code>
            <result_code><![CDATA[SUCCESS]]></result_code>
          </xml>
        `;

        sinon.stub(axios, "post").resolves({
          status: 200,
          data: successXmlResponse,
        });

        const res = await wxPay.post("test/endpoint", { foo: "bar" });

        assert.isTrue(res.success);
        assert.equal(res.data?.return_code, "SUCCESS");
      });

      it("should handle a failed post request", async function () {
        const customConfig = { ...wxPayConfig, key: "mockKey" };
        const wxPay = new WxPayV2(customConfig);

        const failureXmlResponse = `
          <xml>
            <return_code><![CDATA[FAIL]]></return_code>
            <return_msg><![CDATA[Error message]]></return_msg>
          </xml>
        `;

        sinon.stub(axios, "post").resolves({
          status: 200,
          data: failureXmlResponse,
        });

        const res = await wxPay.post("test/endpoint", { foo: "bar" });

        assert.isFalse(res.success);
        assert.equal(res.error?.return_msg, "Error message");
      });
    });
  });
});
