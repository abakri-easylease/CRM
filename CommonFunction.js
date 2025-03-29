require('dotenv').config();
const _ = require("lodash");
const SqlHelper = require("../helper/sqlhelper");
const Send_Mail = require("../helper/sendEmail");
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const CommonDefault = require("../helper/responseMsg");
const upload = require("../helper/upload");
const axios = require('axios');
const qs = require('qs');
var CryptoJS = require("crypto-js");
var xl = require('excel4node');
const AWS = require('aws-sdk');
const CommonData = require('./CommonData');
const awsKey = require('../helper/responseMsg');

var client_id = process.env.CLIENTID;
var client_secret = "rpz8Q~BvgBsi.LO8IDamQbiExW4sf7T-br8tnbyh";
var dynamicUrl = "https://login.microsoftonline.com/8d1028e4-7edf-4c8a-ad4a-d211ecac75f5/oauth2/v2.0/token";
var scope = `${process.env.ErpUrl}/.default`;
const postData = {
    client_id: client_id,
    scope: scope,
    client_secret: client_secret,
    grant_type: 'client_credentials'
};

global.ApiGlobalRequest = {};


const Common = function (common) {
    this.Device_Name = common.Device_Name;
};

Common.Encode = async = (str) => {
    // Create buffer object, specifying utf8 as encoding
    let bufferObj = Buffer.from(str, "utf8");
    return bufferObj.toString("base64");
}

Common.Decode = async = (encode) => {
    // Create buffer object, specifying utf8 as encoding
    return Buffer.from(encode, 'base64');
}

json_response = (data) => {
    return JSON.parse(JSON.stringify(data));
}

//generate admin token when login and manage history
Common.GenerateNewToken = async (request, type, UserType = '') => {
    try {
        let HstID = uuidv4();
        let HST_data;
        let insert_log_data = {}
        // console.log(type, "------>");
        if (type == 1) {
            insert_log_data = {
                'Token': HstID,
                'UserID': request.UserID,
                'EntryIP': request.IpAddress,
                'LoginDate': moment().format('YYYY-MM-DD HH:mm:ss'),
            };

            HST_data = await SqlHelper.insert('hst_admin_login', insert_log_data, (err, res) => {
                if (err) {
                    console.log(err);
                    return 0;
                } else {
                    return res.insertId;
                }
            });
        } else if (type == 2) {
            insert_log_data = {
                "Type": UserType,
                'Token': HstID,
                'UserID': request.UserID,
                'EntryIP': request.IpAddress,
                'LoginDate': moment().format('YYYY-MM-DD HH:mm:ss'),
            };

            HST_data = await SqlHelper.insert('hst_customer_login', insert_log_data, (err, res) => {
                if (err) {
                    console.log(err);

                    return 0;
                } else {
                    return res.insertId;
                }
            });
        } else if (type == 3) {
            insert_log_data = {
                'Token': HstID,
                'UserID': request.UserID,
                'AppVersion': request.AppVersion,
                'DeviceID': request.DeviceID,
                'DeviceToken': request.DeviceToken,
                'DeviceType': request.DeviceType,
                'EntryIP': request.IpAddress,
                'LoginDate': moment().format('YYYY-MM-DD HH:mm:ss'),
            };

            HST_data = await SqlHelper.insert('hst_rider_login', insert_log_data, (err, res) => {
                if (err) {
                    console.log(err);
                    return 0;
                } else {
                    return res.insertId;
                }
            });
        } else if (type == 4) {
            // console.log("4---");
            insert_log_data = {
                'Token': HstID,
                'UserID': request.UserID,
                'LoginDate': moment().format('YYYY-MM-DD HH:mm:ss'),
            };

            HST_data = await SqlHelper.insert('hst_portal_login', insert_log_data, (err, res) => {
                if (err) {
                    console.log(err);
                    return 0;
                } else {
                    return res.insertId;
                }
            });
        }

        // if (HST_data == 0) {
        //     return 0;
        // }
        return Common.TokenEncrypt(HstID);
    } catch (error) {
        return -1;
    }
}

//check admin token is valid or not
Common.CheckValidToken = async (request) => {
    let query = "SELECT * FROM hst_admin_login WHERE Token=? AND UserID=? LIMIT 1";
    let decryptToken = Common.TokenDecrypt(request.Token);
    let HST_data = await SqlHelper.select(query, [decryptToken, request.UserID, request.Source], (err, res) => {
        if (err) {
            console.log(err);
            return [];
        } else {
            return res;
        }
    });

    var response = {
        'status': '3',
        'message': 'Authentication Fail',
    }

    if (HST_data.length > 0) {
        // let CurrentTime = moment().format('DD-MM-YYYY HH:mm:ss');
        // let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('DD-MM-YYYY HH:mm:ss');
        let CurrentTime = moment().format('YYYYMMDDHHmmss');
        let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('YYYYMMDDHHmmss');
        if (CurrentTime <= ExpectedTime) {
            response.status = '1',
                response.message = 'Session fetch Successfully.';
        } else {
            response.status = '3',
                response.message = 'Session expired. try to login again.';
        }
    }

    return response;
}

//generate customer token when login and manage history
Common.GenerateNewCustomerToken = async (request) => {
    let HstID = uuidv4();
    let insert_log_data = {
        'Token': HstID,
        'UserID': request.UserID,
        'Type': request.Type,
        'EntryIP': request.IpAddress,
        'LoginDate': moment().format('YYYY-MM-DD HH:mm:ss'),
    };

    let HST_data = await SqlHelper.insert('hst_customer_login', insert_log_data, (err, res) => {
        if (err) {
            return 0;
        } else {
            return res.insertId;
        }
    });

    if (HST_data == 0) {
        return 0;
    }
    return Common.TokenEncrypt(HstID);
}

//check customer token is valid or not
Common.CheckValidCustomerToken = async (request) => {
    let query = "SELECT * FROM hst_customer_login WHERE Token=? AND UserID=? AND Type=? LIMIT 1";
    let decryptToken = Common.TokenDecrypt(request.Token);
    let HST_data = await SqlHelper.select(query, [decryptToken, request.LoginID, request.Type], (err, res) => {
        if (err) {
            return [];
        } else {
            return res;
        }
    });

    var response = {
        'status': '3',
        'message': 'Authentication Fail',
    }

    if (HST_data.length > 0) {
        // let CurrentTime = moment().format('DD-MM-YYYY HH:mm:ss');
        // let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('DD-MM-YYYY HH:mm:ss');
        let CurrentTime = moment().format('YYYYMMDDHHmmss');
        let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('YYYYMMDDHHmmss');
        if (CurrentTime <= ExpectedTime) {
            response.status = '1',
                response.message = 'Session fetch Successfully.';
        } else {
            response.status = '3',
                response.message = 'Session expired. try to login again.';
        }
    }
    return response;
}
//check portal api token is valid or not
Common.CheckValidPortalToken = async (request) => {
    let query = "SELECT * FROM hst_portal_login WHERE Token=? LIMIT 1";
    let decryptToken = Common.TokenDecrypt(request.Token);
    let HST_data = await SqlHelper.select(query, [decryptToken], (err, res) => {
        if (err) {
            return [];
        } else {
            return res;
        }
    });

    var response = {
        'status': '3',
        'message': 'Authentication Fail',
    }

    if (HST_data.length > 0) {
        // let CurrentTime = moment().format('DD-MM-YYYY HH:mm:ss');
        // let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('DD-MM-YYYY HH:mm:ss');
        let CurrentTime = moment().format('YYYYMMDDHHmmss');
        let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('YYYYMMDDHHmmss');
        if (CurrentTime <= ExpectedTime) {
            response.status = '1',
                response.message = 'Session fetch Successfully.';
        } else {
            response.status = '3',
                response.message = 'Session expired. try to login again.';
        }
    }
    return response;
}
//check app token is valid or not
Common.CheckValidAppToken = async (request) => {
    let DEFAULT_TOKEN = process.env.DEFAULT_TOKEN;
    var allowedDefaultTokenService = [
        'GetRiderDetailFromMobile',
        'RiderRegistration',
        'GetAppDetails',
        'RiderLogin',
        'ForgotPassword',
        'ResetPassword',
        'UserOtpManage',
        'OcrDataGet',
        'OcrDataGetMultipart'
    ];

    var response = {};
    if (request.Token != undefined && request.Token != null && request.Token != '') {
        // console.log(request);
        let decryptToken = Common.TokenDecrypt(request.Token);
        var is_allowes = _.indexOf(allowedDefaultTokenService, request.ServiceName);
        if (is_allowes >= 0 && DEFAULT_TOKEN == decryptToken) {
            response['token'] = request.Token;
            response['status'] = '1';
            response['message'] = 'Authentication success.';
        } else {
            let query = "SELECT * FROM hst_rider_login WHERE Token=? AND UserID=? AND DeviceType=? LIMIT 1";
            let HST_data = await SqlHelper.select(query, [decryptToken, request.UserID, request.DeviceType], (err, res) => {
                if (err) {
                    return [];
                } else {
                    return res;
                }
            });
            // console.log("111");
            var response = {
                'status': '2',
                'message': 'Authentication Fail',
            }

            if (HST_data.length > 0) {
                // let CurrentTime = moment().format('DD-MM-YYYY HH:mm:ss');
                // let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('DD-MM-YYYY HH:mm:ss');
                let CurrentTime = moment().format('YYYYMMDDHHmmss');
                let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('YYYYMMDDHHmmss');
                if (CurrentTime <= ExpectedTime) {
                    response.status = '1',
                        response.message = 'Session fetch Successfully.';
                } else {
                    response.status = '3',
                        response.message = 'Session expired. try to login again.';
                }
            }
        }
    } else {
        // console.log("222");
        response['status'] = '2';
        response['message'] = 'Authentication Fail.';
    }

    return response;
}

Common.generateRandomNumber = (n) => {
    var add = 1,
        max = 12 - add; // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.   

    if (n > max) {
        return generate(max) + generate(n - max);
    }

    max = Math.pow(10, n + add);
    var min = max / 10; // Math.pow(10, n) basically
    var number = Math.floor(Math.random() * (max - min + 1)) + min;

    return ("" + number).substring(add);
};

//Encrypt Token 
Common.TokenEncrypt = (value) => {
    var key = CryptoJS.enc.Utf8.parse(process.env.SECRET_KEY);
    var iv = CryptoJS.enc.Utf8.parse(process.env.SECRET_KEY.substring(0, 16));
    var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(JSON.stringify(value)), key,
        {
            keySize: 256,
            iv: iv,
            mode: CryptoJS.mode.CBC
        });

    return encrypted.toString();
};

//Decrypt Token
Common.TokenDecrypt = (value) => {
    try {
        var key = CryptoJS.enc.Utf8.parse(process.env.SECRET_KEY);
        var IV_KEY = CryptoJS.enc.Utf8.parse(process.env.SECRET_KEY.substring(0, 16));
        let decrypted = CryptoJS.AES.decrypt(value.toString(), key, {
            keySize: 256,
            iv: IV_KEY,
            mode: CryptoJS.mode.CBC
        });
        var Decrypt = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        // console.log(Decrypt);
        return Decrypt;
    } catch (error) {
        console.log(error);
        console.log("Error Occured: " + error);
        return -1;
    }
};

//Encrypt Request and response object
Common.EncryptObject = (Object, DATA_SECRET_KEY = '') => {
    // console.log(Object);
    var value = JSON.stringify(Object);
    if (!DATA_SECRET_KEY) DATA_SECRET_KEY = process.env.DATA_SECRET_KEY;
    console.log("Key used for encrypt ==> ", DATA_SECRET_KEY);
    var key = CryptoJS.enc.Utf8.parse(DATA_SECRET_KEY);
    var iv = CryptoJS.enc.Utf8.parse(DATA_SECRET_KEY.substring(0, 16));
    var encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(value.toString()), key,
        {
            keySize: 256,
            iv: iv,
            mode: CryptoJS.mode.CBC
        });

    return encrypted.toString();
}

//Decrypt request and response object
Common.DecryptObject = (EncryptObject) => {
    try {
        var key = CryptoJS.enc.Utf8.parse(process.env.DATA_SECRET_KEY);
        // console.log("key", process.env.DATA_SECRET_KEY);
        var IV_KEY = CryptoJS.enc.Utf8.parse(process.env.DATA_SECRET_KEY.substring(0, 16));
        // console.log("IV_KEY", process.env.DATA_SECRET_KEY.substring(0, 16));
        let decrypted = CryptoJS.AES.decrypt(EncryptObject, key, {
            keySize: 256,
            iv: IV_KEY,
            mode: CryptoJS.mode.CBC
        });
        var Decrypt = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        ApiGlobalRequest = Decrypt;
        return Decrypt;
    } catch (error) {
        console.log("Error Occured: " + error);
        return -1;
    }
}

//check uploaded file exist in s3 bucket
Common.CheckFileExit = async (res) => {
    if (res.ID == 'null' || res.ID == null || res.ID == undefined || res.ID == 'undefined' || !res.ID) {
        res.ID = 0;
    }
    let FileUrl = CommonDefault.S3Location + res.FolderName + res.Files.trim().replace(/[^a-z0-9.\s]/gi, '').replace(/[_\s]/g, '-');
    var query = `select ` + res.FieldName + ` as File from ` + res.TableName + ` where ` + res.FieldName + ` = '` + FileUrl + `' AND ` + res.IDName + ` != '` + res.ID + `'`;
    let IsExitStat = await new Promise(resolve => {
        SqlHelper.select(query, (err, res) => {
            if (err) {
                return resolve(false);
            } else if (_.isEmpty(res)) {
                return resolve(true);
            } else {
                return resolve(false);
            }
        });
    });
    if (IsExitStat == true && res.ID > 0) {
        var delete_query = `select ` + res.FieldName + ` as File from ` + res.TableName + ` where ` + res.IDName + ` = '` + res.ID + `'`;
        let file_location = await new Promise(resolve => {
            SqlHelper.select(delete_query, (err, res) => {
                if (err) {
                    return resolve(false);
                } else {
                    return resolve(res[0].File);
                }
            });
        });
        if (file_location) {
            file_location = file_location.replace(CommonDefault.S3Location, '');
            if (file_location != "") await upload.S3FileDelete(file_location);
        }
    }
    return IsExitStat;
}

//response format
Common.ResFormat = (status = '0', alert_type = '0', message = '', token = '', data = {}) => {
    let encryptData = {
        'status': status,
        'message': message,
        'token': token,
        'data': data,
    };

    let encryptObj = Common.EncryptObject(encryptData);
    let resp = {};
    if (process.env.IsEncrypt == 'false') {
        resp['Decrypt'] = encryptData;
        // resp['RequestDecrypt'] = ApiGlobalRequest;
    }
    resp['QYUEIMSHNSGMDM'] = encryptObj;
    return resp;
}

//response format
Common.ResChatFormat = (status = '0', alert_type = '0', message = '', request = {}, data = {}) => {
    try {

        const token = request.Token;
        const CallID = request.LogID;

        let encryptData = {
            'status': status,
            'message': message,
            'token': token,
            'data': data,
        };

        let encryptObj = Common.EncryptObject(encryptData);
        let resp = {};
        if (process.env.IsChatEncrypt == 'false') {
            resp['Decrypt'] = encryptData;
        }
        resp['QYUEIMSHNSGMDM'] = encryptObj;

        /** Log update */
        try {
            let LogAdd = {
                'ResponseJson': JSON.stringify(encryptData),
                'Status': '1'
            }
            if (CallID) SqlHelper.update('hst_whatsappservicecall', LogAdd, { 'CallID': CallID }, (err, res) => { })
        } catch (error) { }
        /** Log update */

        return resp;
    } catch (error) {
        return {};
    }
}
//response format
Common.ResFormatApp = async (status = '0', alert_type = '0', message = '', token = '', data = {}) => {
    let encryptData = {
        'Status': status,
        'Message': message,
        'Token': token,
        'Data': data,
    };

    let encryptObj = Common.EncryptObject(encryptData);
    let resp = {};
    resp['QYUEIMSHNSGMDM'] = encryptObj;
    if (process.env.IsEncrypt == 'false') {
        // resp['RequestDecrypt'] = ApiGlobalRequest;
    }
    resp['Decrypt'] = encryptData;

    try {
        if (ApiGlobalRequest && ApiGlobalRequest.InsertLogID) {
            console.log("ApiGlobalRequest.InsertLogID", ApiGlobalRequest.InsertLogID);
            let LogAdd = {
                'ResponseJson': JSON.stringify(encryptData),
                'EncryptReq': JSON.stringify(encryptObj),
                'Status': '1'
            }
            await SqlHelper.update('hst_appservicecall', LogAdd, { 'CallID': ApiGlobalRequest.InsertLogID }, async (err, res) => {
                if (err) console.log(err);
            })
        }
    } catch (error) {
        console.log(error);
    }
    return resp;
}

//response format
Common.ResAdrokFormat = (status = '0', alert_type = '0', message = '', request = {}, data = {}) => {
    try {

        const token = request.Token;
        const CallID = request.LogID;

        let encryptData = {
            'status': status,
            'message': message,
            'token': token,
            'data': data,
        };
        // console.log(encryptData);
        // const secretkey = '';
        const secretkey = process.env.ADNOC_SECRET_KEY;
        let encryptObj = Common.EncryptObject(encryptData, secretkey);
        let resp = {};
        if (process.env.IsAdrokEncrypt == 'false') {
            resp['Decrypt'] = encryptData;
        }
        resp['QYUEIMSHNSGMDM'] = encryptObj;

        /** Log update */
        // try {
        //     let LogAdd = {
        //         'ResponseJson': JSON.stringify(encryptData),
        //         'Status': '1'
        //     }
        //     if (CallID) SqlHelper.update('hst_whatsappservicecall', LogAdd, { 'CallID': CallID }, (err, res) => { })
        // } catch (error) { }
        /** Log update */

        return resp;
    } catch (error) {
        return {};
    }
}

//Method for crud operation's comman messages
Common.CrudMessages = async = () => {
    let CrudMessage = {
        Insert: "Data inserted successfully.",
        Update: "Data updated successfully.",
        Delete: "Data deleted successfully.",
        Select: "Data fetched successfully.",
        Exist: " already exist.",
        Error: "Something is wrong"
    }
    return CrudMessage;
}

//generateReferenceNo
Common.generateReferenceNo = async (IsType = '') => {
    let PrefixKey = '';
    let last_ReferenceNo = '';
    // if (IsType == '0') {
    //     switch (ServiceID) {
    //         case '1':
    //             PrefixKey = 'INS';
    //             break;
    //         default:
    //             PrefixKey = 'NOT';
    //             break;
    //     }

    //     last_ReferenceNo = await SqlHelper.select('SELECT ReferenceNo FROM Student_Reference WHERE ServiceID=? AND ReferenceNo!="" ORDER BY ReferenceID DESC', [ServiceID], (err, res) => {
    //         if (res.length > 0 && res[0]['ReferenceNo'] != '') {
    //             return res[0]['ReferenceNo'].trim();
    //         }
    //         return "";
    //     });
    // } else
    if (IsType == 'customer_callback') {
        PrefixKey = 'CALL';

        last_ReferenceNo = await SqlHelper.select('SELECT ReferenceNo FROM customer_callback WHERE ReferenceNo!="" ORDER BY ReferenceNo DESC', [], (err, res) => {
            if (res.length > 0 && res[0]['ReferenceNo'] != '') {
                return res[0]['ReferenceNo'].trim();
            }
            return "";
        });
    }
    let new_ReferenceNo = ''
    if (PrefixKey != '') {
        new_ReferenceNo = PrefixKey + moment().format('YYYYMMDD') + '00001';
        if (last_ReferenceNo != '') {
            let new_date = PrefixKey + moment().format('YYYYMMDD');
            let old_date = last_ReferenceNo.substr(0, 11);
            let old_sr_no = last_ReferenceNo.substr(11);
            if (new_date == old_date) {
                let new_sr_no = (parseInt(old_sr_no) + 1).toString();
                if (new_sr_no.length == 1)
                    new_sr_no = '0000' + new_sr_no;
                else if (new_sr_no.length == 2)
                    new_sr_no = '000' + new_sr_no;
                else if (new_sr_no.length == 3)
                    new_sr_no = '00' + new_sr_no;
                else if (new_sr_no.length == 4)
                    new_sr_no = '0' + new_sr_no;

                new_ReferenceNo = old_date + new_sr_no;
            }
        }
        return new_ReferenceNo;
    }

}

//generatePassword
Common.generatePassword = async () => {
    var length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

// Job Card service no add
// Common.generateInquiryNo = async (ServiceType = 'Service') => {
//     let PrefixKey = '';
//     switch (ServiceType) {
//         case 'Service': PrefixKey = 'SR';
//             break;
//         case 'Breakdown': PrefixKey = 'BR';
//             break;
//         case 'Accident': PrefixKey = 'AC';
//             break;
//         default: PrefixKey = 'NOT';
//             break;
//     }

//     let last_InquiryNo = await SqlHelper.select('SELECT JobServiceNo FROM jobcard_detail WHERE JobServiceNo!="" AND ServiceType=? ORDER BY JobID DESC', [ServiceType], (err, res) => {
//         if (res.length > 0 && res[0]['JobServiceNo'] != '') {
//             return res[0]['JobServiceNo'].trim();
//         } else {
//             return "";
//         }
//     });

//     let new_InquiryNo = PrefixKey + moment().format('YYYYMMDD') + '0001';
//     if (last_InquiryNo != '') {
//         let new_date = PrefixKey + moment().format('YYYYMMDD');
//         let old_date = last_InquiryNo.substr(0, 10);
//         let old_sr_no = last_InquiryNo.substr(10);
//         if (new_date == old_date) {
//             var str = "" + (parseInt(old_sr_no) + 1).toString();
//             var pad = "0000"
//             let new_sr_no = pad.substring(0, pad.length - str.length) + str
//             new_InquiryNo = old_date + new_sr_no;
//         }
//     }
//     return new_InquiryNo;
// }

Common.generateInquiryNo = async (ServiceType = 'Service') => {
    let PrefixKey = '';
    switch (ServiceType) {
        case 'Service': PrefixKey = 'SR';
            break;
        case 'Breakdown': PrefixKey = 'BR';
            break;
        case 'Accident': PrefixKey = 'AC';
            break;
        default: PrefixKey = 'NOT';
            break;
    }

    // Fetch the latest inquiry number based on sequence
    let last_InquiryNo = await new Promise((resolve, reject) => {
        SqlHelper.select('SELECT JobServiceNo FROM jobcard_detail WHERE JobServiceNo!="" AND ServiceType=? ORDER BY JobID DESC limit 20', [ServiceType], (err, res) => {
            if (err) return reject(err);
            if (res.length > 0) {
                resolve(res.map(row => row['JobServiceNo']).sort().pop());
            } else {
                resolve("");
            }
        });
    });
    // console.log("last_InquiryNo",last_InquiryNo);
    let new_InquiryNo = PrefixKey + moment().format('YYYYMMDD') + '0001';
    if (last_InquiryNo) {
        let new_date = PrefixKey + moment().format('YYYYMMDD');
        let old_date = last_InquiryNo.substr(0, 10);
        let old_sr_no = last_InquiryNo.substr(10);
        if (new_date === old_date) {
            let new_sr_no = (parseInt(old_sr_no) + 1).toString().padStart(4, '0');
            new_InquiryNo = new_date + new_sr_no;
        }
    }
    return new_InquiryNo;
}

//ERPAPIIntegration
Common.ERPAPIIntegration = async (posturl, reqData, request = {}) => {
    try {
        if (process.env.IsERPCalling === 'true') {
            // console.log(`Call Erp Api For ${request.MethodName}`);
            let token = await axios.post(dynamicUrl, qs.stringify(postData), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(response => {
                return response.data.access_token;
            }).catch(err => {
                console.log(err);
                return err;
            })

            reqData['_request']["DataAreaId"] = process.env.DataAreaId;
            let postUrl = posturl;
            // console.log("Final Request ", reqData);

            let headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
            let RequestLog = {
                'Source': request.Source,
                'MethodName': request.MethodName,
                'MethodUrl': posturl,
                'ID': request.ID,
                'EntryDate': moment().format('YYYY-MM-DD HH:mm:ss'),
                'EntryBy': request.EntryBy,
                'EntryIP': request.EntryIP,
            }
            try {

                Object.keys(reqData).forEach(function (key) {
                    if (!reqData[key] || reqData[key] == 'null' || reqData[key] == 'undefined') { reqData[key] = ''; }
                })

                RequestLog['RequestJson'] = JSON.stringify(reqData['_request']);
                var postresponse = await axios.post(postUrl, reqData, { 'headers': headers }).then(response => {
                    RequestLog['ResponseJson'] = JSON.stringify(response.data);
                    return response.data;
                }).catch(err => {
                    RequestLog['ResponseJson'] = JSON.stringify(err);
                    return 0;
                });
                if (postresponse.ResponseCode == '1') {
                    RequestLog['Status'] = postresponse.ResponseCode;
                } else {
                    RequestLog['Status'] = '0';
                    if (request['MethodName'] == 'cancelJobCard') RequestLog['Status'] = '2';
                }

            } catch (error) {
                console.log(error);
                RequestLog['Status'] = '0';
                if (request['MethodName'] == 'cancelJobCard') RequestLog['Status'] = '2';
                RequestLog['ResponseJson'] = JSON.stringify(error);
                var postresponse = 0;
            }
            // console.log("RequestLog ===================> 123", RequestLog);
            if (request !== 0) await SqlHelper.insert('hst_erpservicecall', RequestLog, async (err, res) => {
                if (err) {
                    console.log(err);
                    let TmpError = {
                        'Type': 'hst_erpservicecall',
                        'ErrorMessage': err.sqlMessage,
                    }
                    TmpError['JSON'] = JSON.stringify(RequestLog);
                    await SqlHelper.insert('tmp_error_entry', TmpError, (err, ress) => { });
                }
            });

            return postresponse;
        } else {
            let RequestLog = {
                'Source': request.Source,
                'MethodName': request.MethodName,
                'ID': request.ID,
                'MethodUrl': posturl,
                'RequestJson': JSON.stringify(reqData['_request']),
                'EntryDate': moment().format('YYYY-MM-DD HH:mm:ss'),
                'EntryBy': request.EntryBy,
                'EntryIP': request.EntryIP,
                'Status': '0',
                'ResponseJson': 'ERP NOT CALL'
            }
            // console.log(RequestLog)
            if (request !== 0) {
                await SqlHelper.insert('hst_erpservicecall', RequestLog, async (err, res) => {
                    if (err) {
                        // console.log('sdfssdf') 
                        console.log(err)
                    } else {
                        console.log('res');
                        console.log(res);
                    }
                });
            }
            console.log(`please start erpcalling`);
            return 0;
        }
    } catch (error) {
        let TmpError = {
            'Type': 'hst_erpservicecall',
            'ErrorMessage': error.message,
        }
        TmpError['JSON'] = JSON.stringify(request);
        await SqlHelper.insert('tmp_error_entry', TmpError, (err, ress) => { });
        return 0;
    }
}

//S3FileDelete
Common.S3FileDelete = async (res) => {
    // var query = `select ${res.FieldName} as File from ${res.TableName} where ${res.IDName} = '${res.ID}'`;
    // // console.log(query);
    // let file_location = await new Promise(resolve => {
    //     SqlHelper.select(query, (err, res) => {
    //         if (err) {
    //             console.log(err);
    //             return resolve(false);
    //         } else {
    //             return resolve(res[0].File);
    //         }
    //     });
    // });
    // if (file_location) {
    //     file_location = file_location.replace(process.env.S3Location, '');
    //     await upload.S3FileDelete(file_location);
    //     return file_location;
    // }
    // return file_location;
    return 1;
}


//OTP generate
Common.otp_generate = async (data) => {
    let otpCOde = Math.floor(Math.pow(10, 4 - 1) + Math.random() * 9 * Math.pow(10, 4 - 1));
    var currentTime = new Date();
    var LatconvertTime = moment(currentTime).add('15', 'minutes').format("YYYY-MM-DD HH:mm:ss");
    var convertTime = moment(currentTime).format("YYYY-MM-DD HH:mm:ss");
    let query = "SELECT ApiID FROM api_user_data WHERE Mobile=? ORDER BY ApiID DESC LIMIT 1";
    let api_user_data = await SqlHelper.select(query, [data.Mobile], (err, res) => {
        if (err) {
            return 0;
        } else if (_.isEmpty(res)) {
            return 0;
        } else {
            return res[0].ApiID;
        }
    });
    var RiderData = { 'code': '' }
    try {
        RiderData = await CommonData.GetSingleDetails('mst_rider', 'MobileCountryCode as code', data.UserID, 'RiderID');
    } catch (error) { }

    let api_data = {
        "Mobile": data.Mobile,
        "UserID": data.UserID,
        "DeviceID": data.DeviceID,
        "DeviceType": data.DeviceType,
        "DeviceToken": data.DeviceToken,
        "AppVersion": data.AppVersion,
        "OtpCode": otpCOde,
        "OtpTime": LatconvertTime,
        "EntryDate": convertTime
    };
    let ApiID = 0;
    if (api_user_data == 0) {
        ApiID = await SqlHelper.insert('api_user_data', api_data, async (err, res) => {
            if (err) {
                console.log(err);
                return 0;
            } else {
                //send otp by sms
                let smsData = {};
                smsData.msg = `Use ${otpCOde} as OTP to verify your identity. Treat this as confidential. Easylease never calls to verify your otp.`;
                smsData.recipient = (RiderData.code ? RiderData.code : '') + data.Mobile;
                // smsData.recipient = '971544400184';
                await Send_Mail.SendMobileSMS(smsData, data.UserID);
                return res.insertId;
            }
        });
    } else {
        ApiID = api_user_data;
        let UpdateID = await SqlHelper.update('api_user_data', api_data, { "Mobile": data.Mobile }, async (err, res) => {
            if (err) {
                console.log(err);
                return 0;
            } else {
                //send otp by sms
                let smsData = {};
                smsData.msg = `Use ${otpCOde} as OTP to verify your identity. Treat this as confidential. Easylease never calls to verify your otp.`;
                smsData.recipient = (RiderData.code ? RiderData.code : '') + data.Mobile;
                await Send_Mail.SendMobileSMS(smsData, data.UserID);
                return 1;
            }
        });
    }

    let Response = {
        "ApiID": ApiID,
        "OTPCode": otpCOde
    }
    return Response;
}


//Generate link for rider invitation
Common.GenerateRiderInvitationLink = async (data) => {
    let res = {};
    // let refcode = get_link.referral_code;
    // let link = process.env.CUSTOMERURL + 'api/app/v1.0/GetRiderDetailFromId?mobile=' + encryptmobile + '&compnay=' + encryptcompnay+'&type='+encryptType;
    let url = 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyDADibCqVsUGCSLl9fLpkWHLNwdtWdYsMA';
    var options = {
        "dynamicLinkInfo": {
            "domainUriPrefix": "https://easyleaselink.dnktech.in",
            "link": process.env.DeepLink + "?mobile=" + data.mobile + "&code=" + data.code + "&company=" + data.company + "&type=" + data.type,
            "androidInfo": {
                "androidPackageName": "com.ridersupport.app.easylease"
            },
            "iosInfo": {
                "iosBundleId": "com.easylease.rider",
                "iosAppStoreId": "6444783033"
            }
        }
    };

    // request(options, function (error, response, body) {
    //     if (error) throw new Error(error);
    //     let GatUrl = JSON.parse(body);
    //     res.status = "1";
    //     res.message = "Success";
    //     res.url = GatUrl.shortLink;
    //     return res;
    // });
    let createlink = await axios.post(url, options, {
        headers:
        {
            'postman-token': 'b309f0de-f3fe-662c-9cda-754d8c1f7df2',
            'cache-control': 'no-cache'
        }
    }).then(response => {
        let res = response.data;
        console.log(res);
        return res.shortLink;
    }).catch(err => {
        // console.log(err);
        return err
    })
    return createlink;

}

//Get Count customer reset password log per month
Common.CountRiderResetPwdReq = async (RiderID) => {
    let query = `SELECT COUNT(1) AS Total FROM hst_riderresetpassword 
    WHERE MONTH(EntryDate) = MONTH(CURRENT_DATE()) AND YEAR(EntryDate) = YEAR(CURRENT_DATE()) AND RiderID = ?`;
    let TotalCount = await SqlHelper.select(query, [RiderID], (err, res) => {
        if (err) {
            return 0;
        } else if (_.isEmpty(res)) {
            return 0;
        } else {
            return res[0].Total;
        }
    });

    return TotalCount;
}

// Job Card service no add
Common.generateRewardNo = async () => {
    let PrefixKey = 'RO';

    let last_InquiryNo = await SqlHelper.select('SELECT RewardNo FROM reward_order WHERE RewardNo!="" ORDER BY RewardOrderID DESC', [], (err, res) => {
        if (res.length > 0 && res[0]['RewardNo'] != '') {
            return res[0]['RewardNo'].trim();
        } else {
            return "";
        }
    });

    let new_InquiryNo = PrefixKey + moment().format('YYYYMMDD') + '0001';
    if (last_InquiryNo != '') {
        let new_date = PrefixKey + moment().format('YYYYMMDD');
        let old_date = last_InquiryNo.substr(0, 10);
        let old_sr_no = last_InquiryNo.substr(10);
        if (new_date == old_date) {
            var str = "" + (parseInt(old_sr_no) + 1).toString();
            var pad = "0000"
            let new_sr_no = pad.substring(0, pad.length - str.length) + str
            new_InquiryNo = old_date + new_sr_no;
        }
    }
    return new_InquiryNo;
}
// call function ==> await Common.GetEmailTemplate('1');
Common.GetEmailTemplate = async (TemplateName = '0') => {
    let template_query = 'SELECT TemplateName, TemplateSubject AS Subject, TemplateBody AS Body, CCEmail FROM mst_emailtemplate WHERE TemplateName=? AND Active="1" LIMIT 1';
    let template_data = await SqlHelper.select(template_query, [TemplateName], (err, res) => {
        if (err || _.isEmpty(res)) {
            console.log(err);
            return {
                Body: ''
            };
        } else if (_.isEmpty(res)) {
            return {
                Body: ''
            };
        } else {
            return res[0];
        }
    });

    return template_data;
};

Common.GetNotificationTemplate = async (TemplateName = '0') => {
    let template_query = 'SELECT TemplateID,ApplicationType, Title, Description, IsSound FROM mst_notificationtemplate WHERE TemplateName=? LIMIT 1';
    // console.log(template_query);
    let template_data = await SqlHelper.select(template_query, [TemplateName], (err, res) => {
        if (err || _.isEmpty(res)) {
            console.log(err);
            return {
                Description: ''
            };
        } else if (_.isEmpty(res)) {
            return {
                Description: ''
            };
        } else {
            return res[0];
        }
    });

    return template_data;
};

Common.SendNotification = async (Data) => {

    try {
        if (Data['TemplateID'] || Data['IsGeneral'] == '1') {
            /** notfication Data store in database */
            Data['EntryDate'] = moment().format('YYYY-MM-DD HH:mm:ss');
            if (Data['IsSend'] == '1') {
                Data['NotificationDate'] = moment().format('YYYY-MM-DD HH:mm:ss');
            }

            let NotificationID = await SqlHelper.insert('user_notification', Data, async (err, res) => {
                if (err) {
                    console.log(err);
                    return 0;
                } else {
                    return res.insertId;
                }
            });
            /** notfication Data store in database */

            Data['NotificationID'] = NotificationID;

            /** App notfication fcm */
            if (Data['IsSend'] == '1' && ['Rider', 'RSA Rider', 'Recovery Agent'].includes(Data['UserType'])) {
                let Fcm_Token = await CommonData.GetDeviceToken(Data.UserID);
                Data['Fcm_Token'] = Fcm_Token;
                await Send_Mail.SendMobileNotification(Data, NotificationID);
            }
            /** App notfication fcm */

            /** web Browser notification */
            if (Data['IsSend'] == '1' && Data['UserType'] == 'Customer' && Data['IsSound'] == '1') {
                let query = `select DeviceToken from customer_login where LoginID = ?`;
                Fcm_Token = await SqlHelper.select(query, [Data.UserID], (err, res) => {
                    if (err || _.isEmpty(res)) {
                        return 0;
                    } else {
                        return res[0].DeviceToken;
                    }
                });
                Data['Fcm_Token'] = Fcm_Token;
                await Send_Mail.SendMobileNotification(Data, NotificationID);
                // console.log("DeviceData" , DeviceData);
            }
            /** web Browser notification */


            /** Admin Browser notification */
            if (Data['IsSend'] == '1' && Data['UserType'] == 'Admin' && Data['IsSound'] == '1') {
                let query = `select DeviceToken from mst_user where UserID = ?`;
                Fcm_Token = await SqlHelper.select(query, [Data.UserID], (err, res) => {
                    if (err || _.isEmpty(res)) {
                        return 0;
                    } else {
                        return res[0].DeviceToken;
                    }
                });
                Data['Fcm_Token'] = Fcm_Token;
                await Send_Mail.SendMobileNotification(Data, NotificationID);
                // console.log("DeviceData" , DeviceData);
            }
            /** Admin Browser notification */
            return NotificationID;
        }
        return 1;
    } catch (error) {
        return 0;
    }
};

Common.UpdateDeviceToken = async (Data) => {
    try {
        let query = `SELECT ApiID FROM api_user_data WHERE UserID=? ORDER BY ApiID DESC LIMIT 0,1`;
        let apiID = await SqlHelper.select(query, [Data.UserID], (err, res) => {
            if (err) {
                console.log(err);
                return -1;
            } else if (_.isEmpty(res)) {
                return 0;
            } else {
                return res[0].ApiID;
            }
        });

        if (apiID === -1) {
            return 0;
        }

        if (apiID === 0) {
            let api_data = {
                "Mobile": Data.Mobile,
                "UserID": Data.UserID,
                "DeviceID": Data.DeviceID,
                "DeviceType": Data.DeviceType,
                "DeviceToken": Data.DeviceToken,
                "AppVersion": Data.AppVersion,
                "EntryDate": moment().format('YYYY-MM-DD HH:mm:ss'),
            };
            // console.log(api_data);
            let insertId = await SqlHelper.insert('api_user_data', api_data, async (err, res) => {
                if (err) {
                    console.log(err);
                    return 0;
                } else {
                    console.log("New Device Token ADD");
                    return res.insertId;
                }
            });
            return insertId;
        } else {
            let UpdateID = await SqlHelper.update('api_user_data', { "DeviceToken": Data.DeviceToken }, { "ApiID": apiID }, async (err, res) => {
                if (err) {
                    console.log(err);
                    return 0;
                } else {
                    console.log("Old Device Token Update");
                    return res;
                }
            });
            return UpdateID;
        }
    } catch (error) {
        console.log(error);
        return 0;
    }
};

Common.ObjectClear = (ArraObj) => {
    var NewArray = ArraObj.map(e => {
        Object.keys(e).forEach(function (key) {
            if (!e[key] || e[key] == null || e[key] == 'undefined') { e[key] = ''; }
        })
    })
    // console.log(NewArray);
    return NewArray;
}

// Excel
Common.GenerateExcel = async (Data, FileName = "Excel", IsSameName = 0) => {
    var wb = new xl.Workbook();
    var ws = wb.addWorksheet(FileName);
    ws.row(1).freeze();

    var style2 = wb.createStyle({
        font: {
            color: 'black',
            size: 12,
            bold: true,
            bgColor: '#FFFF8A',
        },
        border: {
            left: { style: "thin", color: "#000000" },
            right: { style: "thin", color: "#000000" },
            top: { style: "thin", color: "#000000" },
            bottom: { style: "thin", color: "#000000" },
        },
        numberFormat: '0', // Simple number format without symbols
    });

    var style = wb.createStyle({
        font: {
            color: 'black',
            size: 12,
        },
        border: {
            left: { style: "thin", color: "#000000" },
            right: { style: "thin", color: "#000000" },
            top: { style: "thin", color: "#000000" },
            bottom: { style: "thin", color: "#000000" },
        },
        numberFormat: '0', // Simple number format without symbols
    });

    function customStartCase(str) {
        try {
            return str
                .split('/')
                .map(part => _.startCase(part))
                .join('/');
        } catch (error) {
            return _.startCase(str);
        }
    }

    var i = 2;
    for (const [tableKay, item2] of Object.entries(Data)) {
        let item = JSON.parse(JSON.stringify(item2, function (key, value) {
            if (typeof value === 'number' && value === 0) {
                return "";
            }
            if (value === '' || value === 'null' || value === 'undefined' || value === undefined || value === null) {
                return "";
            }
            return value;
        }));

        let k2 = 1;
        for (const [key, value] of Object.entries(item)) {
            if (tableKay == 0) {
                ws.cell(1, k2).string(customStartCase(key)).style(style2); // Heading
            }

            // Check if value is a number
            if (typeof value === 'number') {
                ws.cell(i, k2).number(value).style(style); // Write number without symbols
            } else {
                ws.cell(i, k2).string(value).style(style); // Write string as it is
            }

            k2++;
        }
        i++;
    }

    let FileResponse = await new Promise(resolve => {
        wb.writeToBuffer().then(async function (buffer) {
            try {
                FileName = FileName.replace(' ', '_');
            } catch (error) { }
            try {
                var FilenameTosave = FileName + '-' + moment().format('DDMMYYYYHHmmssms') + '-' + uuidv4() + '.xlsx';
                if (IsSameName) {
                    FilenameTosave = `${FileName}.xlsx`;
                }
                var fileName = `report/${FilenameTosave}`; // File name you want to save as in S3
                let file_data = {
                    base64: buffer,
                    type: 'application/xlsx',
                    file_name: fileName
                };
                PdfFile = await upload.uploadToS3(file_data);
                return resolve(PdfFile);
            } catch (error) {
                console.log(error);
                return resolve(error);
            }
        });
    });

    return FileResponse;
}


//ERPMasterDataIntegration
Common.ERPMasterDataIntegration = async (posturl, request = {}) => {
    console.log("Step = 1");
    try {
        let token = await axios.post(dynamicUrl, qs.stringify(postData), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(response => {
            console.log("Step = 2");
            return response.data.access_token;
        }).catch(err => {
            console.log(err);
            return err
        })
        var RequestLog = {
            'Source': request.Source,
            'MethodName': request.MethodName,
            'MethodUrl': posturl,
            'ID': request.ID,
            'EntryDate': moment().format('YYYY-MM-DD HH:mm:ss'),
            'EntryBy': request.EntryBy,
            'EntryIP': request.EntryIP,
        }
        try {
            var config = {
                method: 'get',
                url: posturl,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cookie': 'OpenIdConnect.nonce.5sxAVGACCK1vEZlbgB4gWKRr%2BT0bQ5ubH6RgttWgVvg%3D=QVFBQUFOQ01uZDhCRmRFUmpIb0F3RV9DbC1zQkFBQUFscGkwWUVXUmlFYW1CMW1iWlJKMmZnQUFBQUFDQUFBQUFBQVFaZ0FBQUFFQUFDQUFBQURmNG56OFh5Sk9GN3pPZE9wWWZnYlZhZG1wY1l6ZXdFWEJkVjJwSWNWYU13QUFBQUFPZ0FBQUFBSUFBQ0FBQUFCUUpMT2laRGRFN0VRakdQZ3dVMndvT3ZBeW9vRzcwMnZ4X3dFd1FNc2hDNEFBQUFBQTVWZDVBbHBwdlE1V3hBaEgybFR0LS1uLW5wWTdiSmxEamVBRVpFSHFnb2ExWmhwQ2NBUk12a1FxR3ZhR1pxV0lqSXlnclV5QllnQWF5c01VZUFxVTdmbHZmcnhxQUZtakdSMEhmQ2h5cWxQcUJoSTlWMEw1NjlYYlBOaDY1SlJIdXVxNkdMSmRaUlFRcXl3V0d4WTZTMmxUUXljQ2ZyUlJ2WmlVUGo3MEEwQUFBQUJTMGQzZml3bjJCcmpGaVdzUlhBQXppa3BYM1pNMzV6M1RxTzBuTUtfSHNfX1hJSVlGNDZld2lPdHNLM0xxLWhLemVBdEhvVlNHODNrOGNSa3hRQ3dk'
                }
            };

            var postresponse = await axios(config).then(function (response) {
                RequestLog['Status'] = '1';
                RequestLog['ResponseJson'] = JSON.stringify(response.data.value);
                return response.data.value;
            }).catch(err => {
                console.log(err);
                RequestLog['Status'] = '0';
                RequestLog['ResponseJson'] = JSON.stringify(err);
                return [];
            });

        } catch (error) {
            console.log(error);
            RequestLog['Status'] = '0';
            RequestLog['ResponseJson'] = JSON.stringify(error);
            var postresponse = [];
        }
        // console.log("RequestLog ===================> 123", RequestLog);
        await SqlHelper.insert('hst_erpservicecall', RequestLog, async (err, res) => { if (err) console.log(err) });
        return postresponse;
    } catch (error) {
        console.log(error);
        return [];
    }
}

/** Image Data Capture */
Common.ImageDataCapture = async (Captureimage, IsBase64 = 0) => {
    try {
        const AWS = require('aws-sdk');
        AWS.config.update({
            // accessKeyId: 'AKIAYNNZSXIFXGIHHRFZ',
            // secretAccessKey: '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',
            accessKeyId: awsKey.AWSs3Key.AccessKeyID,
            secretAccessKey: awsKey.AWSs3Key.SecretAccessKey,
            region: 'us-east-1'
        });

        const rekognition = new AWS.Rekognition();
        const fs = require('fs');
        // console.log(image);
        const params = {
            Image: { Bytes: '' },
        };

        if (IsBase64 == 1) {
            console.log("Image is base64");
            params.Image.Bytes = new Buffer.from(Captureimage.replace(/^data:image\/(\w|\+)+;base64,/, ""), 'base64');
        } else {
            console.log("Image is mutlipart");
            Captureimage.map((item) => {
                params.Image.Bytes = item.buffer;
            });
        }

        // Call the detectLabels operation with the binary buffer
        let Data = await new Promise(resolve => {
            rekognition.detectText(params, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    return resolve(err);
                } else {
                    return resolve(data);
                }
            });
        });

        let awsTest = {
            "KeyWords": {
                "idKeyWords": {
                    "front": {
                        "idNumber": "ID Number",
                        "name": "Name: ",
                        "nationality": "Nationality: ",
                        "dateOfBirth": "Date of Birth:",
                        "issueDate": "Issuing Date",
                        "expiryDate": "Expiry Date"
                    },
                    "back": {
                        "dateOfBirth": "Birth",
                        "expiryDate": "Expiry"
                    }
                },
                "licenseKeyWords": {
                    "licenseNo": "License No",
                    "name": "Name",
                    "nationality": "Nationality",
                    "placeofissue": "Place of Issue",
                }
            },
            "DocumentGet": Data
        }
        let KeyWords = awsTest.KeyWords;
        let Document = awsTest.DocumentGet;
        //Execute over the test data
        let FinalData = await Common.extractDataFromResponse(Document.TextDetections, KeyWords);

        // try {
        //     let LastName = FinalData.Name.split(' ')[FinalData.Name.split(' ').length - 1];
        //     let FirstName = FinalData.Name.split(' ')[0];
        //     FinalData.FirstName = FirstName;
        //     FinalData.MiddleName = (FinalData.Name.replace(FirstName, '').replace(LastName, '')).trim();
        //     FinalData.LastName = LastName;
        // } catch (error) {}

        try {
            if (FinalData.DateOfBirth.indexOf('-') > -1) {
                console.log(FinalData.DateOfBirth);
                FinalData.DateOfBirth = moment(FinalData.DateOfBirth, 'DD-MM-YYYY').format('DD/MM/YYYY');
            }
        } catch (error) { }

        try {
            if (FinalData.IssueDate.indexOf('-') > -1) {
                FinalData.IssueDate = moment(FinalData.IssueDate, 'DD-MM-YYYY').format('DD/MM/YYYY');
            }
        } catch (error) { }

        try {
            if (FinalData.ExpiryDate.indexOf('-') > -1) {
                FinalData.ExpiryDate = moment(FinalData.ExpiryDate, 'DD-MM-YYYY').format('DD/MM/YYYY');
            }
        } catch (error) { }

        try {
            if (!FinalData.IssueDate && FinalData.ExpiryDate) {
                // console.log(FinalData.ExpiryDate);
                let EIDExpiryDateDiff = await CommonData.GetCustomerSettingData('"EIDExpiryDateDiff"');
                let EIDExpiryDateDiff2 = EIDExpiryDateDiff[0]?.Value ? EIDExpiryDateDiff[0]?.Value : 2;
                console.log(EIDExpiryDateDiff2);
                FinalData.IssueDate = moment(FinalData.ExpiryDate, 'DD/MM/YYYY').subtract(EIDExpiryDateDiff2, 'years').format('DD/MM/YYYY');
                FinalData.IssueDate = moment(FinalData.IssueDate, 'DD/MM/YYYY').subtract(1, 'day').format('DD/MM/YYYY');
                // // moment().add(3, 'hours').format('YYYYMMDDHHmmss'),
                // console.log("FinalData.IssueDate", FinalData.IssueDate);
            }
        } catch (error) { }
        // console.log(FinalData);


        return FinalData;
    } catch (error) {
        console.log(error);
        return 0;
    }

};
/** Image Data Capture */

/** Image Data Capture */
Common.extractDataFromResponse = async (textDetection, keyWords) => {
    var detectedTextFromID = {};
    try {
        // console.log("textDetection", textDetection);
        if (textDetection.some(item => item.DetectedText && item.DetectedText.includes(keyWords.idKeyWords.front.idNumber))) {
            //Type 2 and Front Type 1
            var lineTextDetection = textDetection.filter((item) => {
                if (item.Type == "LINE") {
                    return true;
                }
                return false;
            }).map(function (item) { return item; });
            //Get license number
            var idFound = false;
            var idTextDetection = lineTextDetection.filter((item) => {
                if (idFound) {
                    return true;
                } else if (item.DetectedText.match(/^[0-9-]+$/gm)) {
                    detectedTextFromID.ID = item.DetectedText;
                    idFound = true;
                    return false;
                }
                return false;
            }).map(function (item) { return item; });
            //Get Dates
            var datesCounter = 0;
            var datesFoundTextDetection = idTextDetection.filter((item) => {
                if (datesCounter == 3) {
                    return true;
                } else if (item.DetectedText.match(/\d{2}\/\d{2}\/\d{4}$/g)) {
                    if (datesCounter == 0) {
                        detectedTextFromID.DateOfBirth = item.DetectedText.replace(/[a-z A-Z]*/g, "");;
                    } else if (datesCounter == 1) {
                        detectedTextFromID.IssueDate = item.DetectedText.replace(/[a-z A-Z]*/g, "");;
                    } else {
                        detectedTextFromID.ExpiryDate = item.DetectedText.replace(/[a-z A-Z]*/g, "");;
                    }
                    datesCounter++;
                    return false;
                } else if ((datesCounter > 0 || item.DetectedText.includes(keyWords.idKeyWords.front.dateOfBirth)) && !item.DetectedText.includes(keyWords.idKeyWords.front.nationality)) {
                    return false;
                }
                return true;
            }).map(function (item) { return item; });
            //Get Name
            var nameTop = 0;
            var nameFound = datesFoundTextDetection.filter((item) => {
                var diffTop = item.Geometry.BoundingBox.Top - nameTop;
                if (item.DetectedText.includes(keyWords.idKeyWords.front.name)) {
                    nameTop = item.Geometry.BoundingBox.Top;

                    if (item.DetectedText.length > keyWords.idKeyWords.front.name.length) {
                        detectedTextFromID.Name = item.DetectedText.substring(keyWords.idKeyWords.front.name.length);
                        return false;
                    }
                    for (var i = 0; i < datesFoundTextDetection.length; i++) {
                        var diff = Math.abs(datesFoundTextDetection[i].Geometry.BoundingBox.Top - item.Geometry.BoundingBox.Top);
                        if (diff > 0 && diff < 0.005 && datesFoundTextDetection[i].Confidence > 80) {
                            detectedTextFromID.Name = datesFoundTextDetection[i].DetectedText;
                            return false;
                        }
                    }

                    return false;
                } else if (detectedTextFromID.Name && detectedTextFromID.Name == item.DetectedText) {
                    return false;
                } else if (detectedTextFromID.Name && item.DetectedText.match(/[a-z A-Z]+/gm) && diffTop < 0.07 && !item.DetectedText.includes(keyWords.idKeyWords.front.dateOfBirth)) {
                    //Old id 2 lines name
                    detectedTextFromID.Name += " " + item.DetectedText.match(/[a-z A-Z]+/gm)[0];
                    return false;
                }
                return true;
            }).map(function (item) { return item; });
            //Get Nationality
            var nationalityFound = datesFoundTextDetection.filter((item) => {
                if (item.DetectedText.includes(keyWords.idKeyWords.front.nationality)) {
                    if (item.DetectedText.length > keyWords.idKeyWords.front.nationality.length) {
                        detectedTextFromID.Nationality = item.DetectedText.substring(keyWords.idKeyWords.front.nationality.length);
                        return false;
                    }
                    for (var i = 0; i < datesFoundTextDetection.length; i++) {
                        var diff = Math.abs(datesFoundTextDetection[i].Geometry.BoundingBox.Top - item.Geometry.BoundingBox.Top);
                        if (diff > 0 && diff < 0.005 && datesFoundTextDetection[i].Confidence > 80) {
                            detectedTextFromID.Nationality = datesFoundTextDetection[i].DetectedText.match(/[a-zA-Z]*/g)[0];
                            return false;
                        }
                    }
                    return false;
                } else if (detectedTextFromID.Nationality && detectedTextFromID.Nationality == item.DetectedText) {
                    return false;
                }
                return true;
            }).map(function (item) { return item; });
        } else if (textDetection.some(item => item.DetectedText && item.DetectedText.includes(keyWords.licenseKeyWords.licenseNo))) {
            //Driving license
            //Get only lines
            var lineTextDetection = textDetection.filter((item) => {
                if (item.Type == "LINE") {
                    return true;
                }
                return false;
            }).map(function (item) { return item; });
            //Get only english
            var englishTextDetection = lineTextDetection.filter((item) => {
                if (item.DetectedText.match(/[\u0621-\u064A]+/gm) == null) {
                    return true;
                }
                return false;
            }).map(function (item) { return item; });
            //Get license number
            var licensFound = false;
            var licenseFoundTextDetection = englishTextDetection.filter((item) => {
                if (licensFound) {
                    return true;
                } else if (item.DetectedText.match(/^[0-9]+$/gm)) {
                    detectedTextFromID.LicenseNo = item.DetectedText;
                    licensFound = true;
                    return false;
                }
                return false;
            }).map(function (item) { return item; });
            //Get Dates
            var datesCounter = 0;
            var datesFoundTextDetection = licenseFoundTextDetection.filter((item) => {
                if (datesCounter == 3) {
                    return true;
                } else if (item.DetectedText.match(/\d{2}-\d{2}-\d{4}$/g)) {
                    if (datesCounter == 0) {
                        detectedTextFromID.DateOfBirth = item.DetectedText;
                    } else if (datesCounter == 1) {
                        detectedTextFromID.IssueDate = item.DetectedText;
                    } else {
                        detectedTextFromID.ExpiryDate = item.DetectedText;
                    }
                    datesCounter++;
                    return false;
                } else if (datesCounter > 0 || item.DetectedText.includes(keyWords.licenseKeyWords.dateOfBirth)) {
                    return false;
                }
                return true;
            }).map(function (item) { return item; });
            //Get license auth
            var licenseAuthFound = datesFoundTextDetection.filter((item) => {
                if (item.DetectedText.match(/[A-Z]+\d+/gm)) {
                    detectedTextFromID.LicenseAuth = item.DetectedText;
                    return false;
                }
                return true;
            }).map(function (item) { return item; });
            //Get Name
            var nameFound = licenseAuthFound.filter((item) => {
                if (item.DetectedText.includes(keyWords.licenseKeyWords.name)) {
                    if (item.DetectedText.length > keyWords.licenseKeyWords.name.length) {
                        detectedTextFromID.Name = item.DetectedText.substring(keyWords.licenseKeyWords.name.length + 1);
                        return false;
                    }
                    for (var i = 0; i < licenseAuthFound.length; i++) {
                        var diff = Math.abs(licenseAuthFound[i].Geometry.BoundingBox.Top - item.Geometry.BoundingBox.Top);
                        if (diff > 0 && diff < 0.005 && licenseAuthFound[i].Confidence > 80) {
                            detectedTextFromID.Name = licenseAuthFound[i].DetectedText;
                            return false;
                        }
                    }
                    return false;
                } else if (detectedTextFromID.Name && detectedTextFromID.Name == item.DetectedText) {
                    return false;
                }
                return true;
            }).map(function (item) { return item; });
            //Get Nationality
            var nationalityFound = lineTextDetection.filter((item) => {
                if (item.DetectedText.includes(keyWords.licenseKeyWords.nationality)) {
                    if (item.DetectedText.length > keyWords.licenseKeyWords.nationality.length) {
                        detectedTextFromID.Nationality = item.DetectedText.substring(keyWords.licenseKeyWords.nationality.length + 1);
                        return false;
                    }
                    for (var i = 0; i < lineTextDetection.length; i++) {
                        var diff = Math.abs(lineTextDetection[i].Geometry.BoundingBox.Top - item.Geometry.BoundingBox.Top);
                        if (diff > 0 && diff < 0.005 && lineTextDetection[i].Confidence > 80) {
                            detectedTextFromID.Nationality = lineTextDetection[i].DetectedText.match(/[a-zA-Z]*/g)[0];
                            return false;
                        }
                    }
                    return false;
                } else if (detectedTextFromID.Nationality && detectedTextFromID.Nationality == item.DetectedText) {
                    return false;
                }
                return true;
            }).map(function (item) { return item; });
            //Get Place of Issue
            var placeOfIssueFound = nationalityFound.filter((item) => {
                if (item.DetectedText.includes(keyWords.licenseKeyWords.placeofissue)) {
                    if (item.DetectedText.length > keyWords.licenseKeyWords.placeofissue.length) {
                        detectedTextFromID.placeofissue = item.DetectedText.substring(keyWords.licenseKeyWords.placeofissue.length + 1);
                        return false;
                    }
                    for (var i = 0; i < nationalityFound.length; i++) {
                        var diffTop = Math.abs(nationalityFound[i].Geometry.BoundingBox.Top - item.Geometry.BoundingBox.Top);
                        var diffLeft = nationalityFound[i].Geometry.BoundingBox.Left - item.Geometry.BoundingBox.Left;
                        if (diffTop > 0 && diffTop < 0.02 && diffLeft > 0 && diffLeft < 0.2 && nationalityFound[i].Confidence > 80) {
                            detectedTextFromID.placeofissue = nationalityFound[i].DetectedText.match(/[a-z A-Z]*/g)[0].trim();
                            return false;
                        }
                    }
                    return false;
                } else if (detectedTextFromID.placeofissue && detectedTextFromID.placeofissue == item.DetectedText) {
                    return false;
                }
                return true;
            }).map(function (item) { return item; });

        } else if (textDetection.some(item => item.DetectedText && item.DetectedText.includes(keyWords.idKeyWords.back.dateOfBirth)) && textDetection.some(item => item.DetectedText && item.DetectedText.includes(keyWords.idKeyWords.back.expiryDate))) {
            //Type 1 - Old - Back
            var wordTextDetection = textDetection.filter((item) => {
                if (item.Type == "WORD") {
                    return true;
                }
                return false;
            }).map(function (item) { return item; });
            var datesArr = wordTextDetection.filter((item) => {
                if (item.DetectedText.match(/\d{2}\/\d{2}\/\d{4}$/g) != null) {
                    return true;
                }
                return false;
            }).map(function (item) { return item.DetectedText; });;
            if (datesArr.length >= 2) {
                detectedTextFromID.DateOfBirth = datesArr[0];
                detectedTextFromID.ExpiryDate = datesArr[1];
            }
        }
        if (detectedTextFromID.Name) {
            var splittedName = detectedTextFromID.Name.split(" ");
            detectedTextFromID.FirstName = splittedName[0];
            detectedTextFromID.LastName = splittedName[splittedName.length - 1];
            if (splittedName.length > 2) {
                if (splittedName[splittedName.length - 2] == "Abdul" || splittedName[splittedName.length - 2] == "El" || splittedName[splittedName.length - 2] == "Al") {
                    detectedTextFromID.LastName = splittedName[splittedName.length - 2] + " " + splittedName[splittedName.length - 1];
                }
                if (splittedName[0] == "Abdul" || splittedName[0] == "El" || splittedName[0] == "Al") {
                    detectedTextFromID.FirstName = splittedName[0] + " " + splittedName[1];
                }
                var middleNameStart = detectedTextFromID.FirstName.length;
                var middleNameEnd = detectedTextFromID.Name.length - detectedTextFromID.LastName.length;
                detectedTextFromID.MiddleName = detectedTextFromID.Name.substring(middleNameStart, middleNameEnd).trim();
            } else {
                detectedTextFromID.MiddleName = "";
            }
        }
        return detectedTextFromID;
    } catch (error) {
        console.log(error);
        return {};
    }
};
/** Image Data Capture */


Common.TmpNotificationAdd = async (Data) => {
    try {
        let query = `SELECT TmpNoID FROM tmp_notification WHERE UserID=? AND DeviceToken=?`;
        let apiID = await SqlHelper.select(query, [Data.UserID, Data.DeviceToken], (err, res) => {
            if (err) {
                console.log(err);
                return -1;
            } else if (_.isEmpty(res)) {
                return 0;
            } else {
                return res[0].TmpNoID;
            }
        });

        if (apiID === -1) {
            return 0;
        }

        let UserType = {
            "1": "Rider",
            "2": "RSA",
            "3": "Recovery Agent"
        }

        if (apiID === 0) {
            let tmp = {
                'UserType': 'Rider',
                'ApplicationType': 'Mobile',
                'UserID': Data.UserID,
                'TemplateID': 0,
                'Title': 'Welcome to Easylease app',
                'Description': 'Welcome to Easylease app',
                'IsRedirect': '1',
                'IsSend': '1',
                'Webscreen': '',
                'AppScreen': '20',
                'DeviceType': '',
                'IsSound': '1',
                'IsGeneral': '1'
            }
            let NotificationInsertData = tmp;
            await Common.SendNotification(NotificationInsertData);

            let api_data = {
                "UserID": Data.UserID,
                "DeviceToken": Data.DeviceToken,
                "UserType": UserType[Data.UserType],
                "EntryDate": moment().format('YYYY-MM-DD HH:mm:ss'),
            };
            // console.log(api_data);
            let insertId = await SqlHelper.insert('tmp_notification', api_data, async (err, res) => {
                if (err) {
                    console.log(err);
                    return 0;
                } else {
                    console.log("New Device Token ADD");
                    return res.insertId;
                }
            });
            return insertId;
        } else {
            return apiID;
        }
    } catch (error) {
        console.log(error);
        return 0;
    }
};

Common.AdocCheckValidToken = async (request) => {
    let query = "SELECT * FROM hst_admin_login WHERE Token=? LIMIT 1";
    let decryptToken = Common.TokenDecrypt(request.Token);
    let HST_data = await SqlHelper.select(query, [decryptToken], (err, res) => {
        if (err) {
            console.log(err);
            return [];
        } else {
            return res;
        }
    });

    var response = {
        'status': '3',
        'message': 'Authentication Fail',
    }

    if (HST_data.length > 0) {
        // let CurrentTime = moment().format('DD-MM-YYYY HH:mm:ss');
        // let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('DD-MM-YYYY HH:mm:ss');
        let CurrentTime = moment().format('YYYYMMDDHHmmss');
        let ExpectedTime = moment(HST_data[0]['LoginDate']).add(24, 'hours').format('YYYYMMDDHHmmss');
        if (CurrentTime <= ExpectedTime) {
            response.status = '1',
                response.message = 'Session fetch Successfully.';
        } else {
            response.status = '3',
                response.message = 'Session expired. try to login again.';
        }
    }

    return response;
}
module.exports = Common;
