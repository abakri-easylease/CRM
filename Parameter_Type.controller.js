const ParameterType = require("../models/Parameter_Type.model");
const Code = require("../../../../helper/responseMsg");
const async = require('async');
const { Common, Financial, CommonData } =  require("../../../../helper");
const _ = require("lodash");
const CrudMessage = Common.CrudMessages()

/*  Parameter Type - Get parameter type data
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.Mst_ParameterTypeList = (req, res) => {
    req.body.PageNo = (req.body.PageNo > 0 ? req.body.PageNo : '1');
    var data = {};
    async.waterfall([
        function (done) {
            ParameterType.Mst_ParameterTypeCount(req.body, (err, data1) => {
                if (err) {
                    res.status(500).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, err.message, req.body.Token, {}));
                } else {
                    let para_data = {};
                    para_data['TotalRecord'] = data1.CountData[0].total.toString();
                    para_data['TotalPage'] = Math.ceil(data1.CountData[0].total / req.body.Limit).toString();
                    para_data['CurrentPage'] = req.body.PageNo;
                    data['para_data'] = para_data;
                    data['where'] = data1.where;
                    data['where_array'] = data1.where_array;

                    done(null, data);
                }
            });
        },
        function (data, done) {
            let reqObj = {
                'req_body': req.body,
                'where': data.where,
                'where_array': data.where_array
            }
            ParameterType.Mst_ParameterTypeList(reqObj, (err, data2) => {
                if (err) {
                    res.status(500).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, err.message, req.body.Token, {}));
                } else {
                    delete data.where;
                    delete data.where_array;
                    data['list'] = data2;
                    res.status(200).send(Common.ResFormat(Code.ErrorCode.Success, Code.AlertTypeCode.Noalert, CrudMessage.Select, req.body.Token, data));

                }
            });
        },
    ], function (err, result) {
    });
};
/*----------------End-------------*/

/*  Parameter Type - Add/Update parameter type data
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.AddMst_ParameterType = (req, res) => {
    req.body.IpAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    ParameterType.AddMst_ParameterType(req.body, (err, data) => {
        if (err) {
            res.status(500).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, err.message, req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));

        }
    });
};
/*----------------End-------------*/

/*  Parameter Type - Remove parameter type data
    Develop by Heli 
*/ 
/*----------------Start-------------*/
exports.DeleteMst_ParameterType = (req, res) => {
    req.body.IpAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    ParameterType.DeleteMst_ParameterType(req.body, (err, data) => {
        if (err) {
            res.status(500).send(Common.ResFormat(Code.ErrorCode.Error, Code.AlertTypeCode.Toaster, err.message, req.body.Token, {}));
        } else {
            res.status(200).send(Common.ResFormat(data.status, Code.AlertTypeCode.Noalert, data.message, req.body.Token, data.data));
        }
    });
};
/*----------------End-------------*/
