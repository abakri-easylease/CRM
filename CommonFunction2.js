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

var client_id = "c3770086-493e-4403-83e6-f11cf37e77cf";
var client_secret = "rpz8Q~BvgBsi.LO8IDamQbiExW4sf7T-br8tnbyh";
var dynamicUrl = "https://login.microsoftonline.com/8d1028e4-7edf-4c8a-ad4a-d211ecac75f5/oauth2/v2.0/token";
var scope = "https://el-uat.sandbox.operations.uae.dynamics.com/.default";
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
                // console.log('err1');
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
}

//check admin token is valid or not
Common.CheckValidToken = async (request) => {
    let query = "SELECT * FROM hst_admin_login WHERE Token=? AND UserID=? LIMIT 1";
    let decryptToken = Common.TokenDecrypt(request.Token);
    let HST_data = await SqlHelper.select(query, [decryptToken, request.UserID, request.Source], (err, res) => {
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
        'UserOtpManage'
    ];

    var response = {};
    if (request.Token != undefined && request.Token != null && request.Token != '') {
        // console.log(request);
        let decryptToken = Common.TokenDecrypt(request.Token);
        var is_allowes = _.indexOf(allowedDefaultTokenService, request.ServiceName);
        console.log("is_allowes", is_allowes);
        console.log(decryptToken);
        console.log(DEFAULT_TOKEN);
        if (is_allowes >= 0 && DEFAULT_TOKEN == decryptToken) {
            response['token'] = request.Token;
            response['status'] = '1';
            response['message'] = 'Authentication success.';
        } else {
            let query = "SELECT * FROM hst_rider_login WHERE Token=? AND UserID=? AND DeviceType=? LIMIT 1";
            console.log(query);
            console.log(decryptToken, request.UserID, request.DeviceType);
            let HST_data = await SqlHelper.select(query, [decryptToken, request.UserID, request.DeviceType], (err, res) => {
                if (err) {
                    return [];
                } else {
                    return res;
                }
            });
            console.log("111");
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
        console.log("222");
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
        return 0;
    }
};

//Encrypt Request and response object
Common.EncryptObject = (Object) => {
    // console.log(Object);
    var value = JSON.stringify(Object);

    var key = CryptoJS.enc.Utf8.parse(process.env.DATA_SECRET_KEY);
    var iv = CryptoJS.enc.Utf8.parse(process.env.DATA_SECRET_KEY.substring(0, 16));
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
        return 0;
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
Common.ResFormatApp = (status = '0', alert_type = '0', message = '', token = '', data = {}) => {
    let encryptData = {
        'Status': status,
        'Message': message,
        'Token': token,
        'Data': data,
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

    let last_InquiryNo = await SqlHelper.select('SELECT JobServiceNo FROM jobcard_detail WHERE JobServiceNo!="" AND ServiceType=? ORDER BY JobID DESC', [ServiceType], (err, res) => {
        if (res.length > 0 && res[0]['JobServiceNo'] != '') {
            return res[0]['JobServiceNo'].trim();
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

//ERPAPIIntegration
Common.ERPAPIIntegration = async (posturl, reqData, request = {}) => {
    if (process.env.IsERPCalling === 'true') {
        // console.log(`Call Erp Api For ${request.MethodName}`);
        let token = await axios.post(dynamicUrl, qs.stringify(postData), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(response => {
            return response.data.access_token;
        }).catch(err => {
            console.log(err);
            return err
        })

        reqData['_request']["DataAreaId"] = process.env.DataAreaId;
        let postUrl = posturl;
        // console.log("Final Request ", reqData);

        let headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
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

            Object.keys(reqData).forEach(function(key) {
                if(!reqData[key] || reqData[key] == 'null' || reqData[key] == 'undefined') { reqData[key] = ''; }
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
                if(request['MethodName'] == 'cancelJobCard') RequestLog['Status'] = '2';
            }

        } catch (error) {
            console.log(error);
            RequestLog['Status'] = '0';
            if(request['MethodName'] == 'cancelJobCard') RequestLog['Status'] = '2';
            RequestLog['ResponseJson'] = JSON.stringify(error);
            var postresponse = 0;
        }
        // console.log("RequestLog ===================> 123", RequestLog);
        if(request !== 0) await SqlHelper.insert('hst_erpservicecall', RequestLog, async (err, res) => { if (err) console.log(err) });

        return postresponse;
    } else {
        var RequestLog = {
            'Source': request.Source,
            'MethodName': request.MethodName,
            'ID': request.ID,
            'MethodUrl': posturl,
            'RequestJson': JSON.stringify(reqData['_request']),
            'EntryDate': moment().format('YYYY-MM-DD HH:mm:ss'),
            'EntryBy': request.EntryBy,
            'EntryIP': request.EntryIP,
            'Status': '0',
            'ResponseJson' : 'ERP NOT CALL'
        }
        // console.log(RequestLog)
        if(request !== 0) {
            await SqlHelper.insert('hst_erpservicecall', RequestLog, async (err, res) => { 
                if (err){
                    // console.log('sdfssdf') 
                    console.log(err) 
                }else{
                    console.log('res');
                    console.log(res);
                }
            });
        }
        console.log(`please start erpcalling`);
        return 0;
    }
}

//S3FileDelete
Common.S3FileDelete = async (res) => {
    var query = `select ${res.FieldName} as File from ${res.TableName} where ${res.IDName} = '${res.ID}'`;
    // console.log(query);
    let file_location = await new Promise(resolve => {
        SqlHelper.select(query, (err, res) => {
            if (err) {
                console.log(err);
                return resolve(false);
            } else {
                return resolve(res[0].File);
            }
        });
    });
    if (file_location) {
        file_location = file_location.replace(process.env.S3Location, '');
        await upload.S3FileDelete(file_location);
        return file_location;
    }
    return file_location;
}


//OTP generate
Common.otp_generate = async (data) => {
    let otpCOde = Math.floor(Math.pow(10, 4 - 1) + Math.random() * 9 * Math.pow(10, 4 - 1));
    var currentTime = new Date();
    var LatconvertTime = moment(currentTime).add('15', 'minutes').format("YYYY-MM-DD HH:mm:ss");
    var convertTime = moment(currentTime).format("YYYY-MM-DD HH:mm:ss");
    let query = "SELECT ApiID FROM api_user_data WHERE Mobile=? ORDER BY ApiID DESC LIMIT 1";
    let api_user_data = await SqlHelper.select(query,[data.Mobile], (err, res) => {
        if (err) {
            return 0;
        } else if (_.isEmpty(res)) {
            return 0;
        } else {
            return res[0].ApiID;
        }
    });
    var RiderData = { 'code' : '' }
    try {
        RiderData = await CommonData.GetSingleDetails('mst_rider', 'MobileCountryCode as code', data.UserID, 'RiderID');
    } catch (error) {}
    
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
                smsData.msg = `Use ${otpCOde} as OTP to verify your identity. Treat this as confidential. RTA never calls to verify your otp.`;
                smsData.recipient = (RiderData.code ? RiderData.code : '') + data.Mobile;
                // smsData.recipient = '971544400184';
                // console.log("smsData =1" , smsData, RiderData.code);
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
                smsData.msg = `Use ${otpCOde} as OTP to verify your identity. Treat this as confidential. RTA never calls to verify your otp.`;
                smsData.recipient = (RiderData.code ? RiderData.code : '') + data.Mobile;
                // console.log("smsData" , smsData, (RiderData.code ? '': RiderData.code));
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
    let url = 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyC3UJttgGf-qu0f_NErfbX1Sx1dlt1qL0c';
    var options = {
        "dynamicLinkInfo": {
            "domainUriPrefix": "https://apprtaiot.dnktech.in",
            "link": "http://easyleaseweb.dnktech.in/?mobile=" + data.mobile + "&code=" + data.code + "&company=" + data.company + "&type=" + data.type,
            "androidInfo": {
                "androidPackageName": "com.ridersupportapp.app.rta"
            },
            "iosInfo": {
                "iosBundleId": "com.example.ios"
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
        console.log(err);
        return err
    })
    return createlink;

}

//Get Count customer reset password log per month
Common.CountRiderResetPwdReq = async (RiderID) => {
    let query = `SELECT COUNT(ID) AS Total FROM hst_riderresetpassword 
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
        if(Data['TemplateID'] || Data['IsGeneral'] == '1') {
            /** notfication Data store in database */
            Data['EntryDate'] = moment().format('YYYY-MM-DD HH:mm:ss');
            if(Data['IsSend'] == '1') {
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

            /** App notfication fcm */
            if (Data['IsSend'] == '1' && Data['UserType'] == 'Rider' && Data['IsSound'] == '1') {
                let Fcm_Token = await CommonData.GetDeviceToken(Data.UserID);
                Data['Fcm_Token'] = Fcm_Token;
                await Send_Mail.SendMobileNotification(Data, NotificationID);
            }
            /** App notfication fcm */

            /** web Browser notification */
            if(Data['IsSend'] == '1' && Data['UserType'] == 'Customer' && Data['IsSound'] == '1') {
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
            if(Data['IsSend'] == '1' && Data['UserType'] == 'Admin' && Data['IsSound'] == '1') {
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
    let query = `SELECT ApiID FROM api_user_data WHERE UserID=? ORDER BY ApiID DESC LIMIT 0,1`;
    let apiID = await SqlHelper.select(query, [Data.UserID], (err, res) => {
        if (err) {
            console.log(err);
            return 0;
        } else if (_.isEmpty(res)) {
            return 0;
        } else {
            return res[0].ApiID;
        }
    });
    if (apiID == 0) {
        return 0;
    }
    let UpdateID = await SqlHelper.update('api_user_data', { "DeviceToken": Data.DeviceToken }, { "ApiID": apiID }, async (err, res) => {
        if (err) {
            console.log(err);
            return 0;
        } else {
            return res.insertId;
        }
    });
    return UpdateID;
};

Common.ObjectClear = (ArraObj) => {
    var NewArray = ArraObj.map(e=>{
        Object.keys(e).forEach(function(key) {
            if(!e[key] || e[key] == null || e[key] == 'undefined') { e[key] = ''; }
        })
    })
    // console.log(NewArray);
    return NewArray;
}

// Excel
Common.GenerateExcel = async (Data, FileName = "Excel") => {
    //  console.log(Data)
    
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
             left: {
               style: "thin",
               color: "#000000"
             },
             right: {
               style: "thin",
               color: "#000000"
             },
             top: {
               style: "thin",
               color: "#000000"
             },
             bottom: {
               style: "thin",
               color: "#000000"
             },
           },
         numberFormat: '$#,##0.00; ($#,##0.00); -',
     });
     var style = wb.createStyle({
         font: {
             color: 'black',
             size: 12,
         },

     border: {
             left: {
               style: "thin",
               color: "#000000"
             },
             right: {
               style: "thin",
               color: "#000000"
             },
             top: {
               style: "thin",
               color: "#000000"
             },
             bottom: {
               style: "thin",
               color: "#000000"
             },
           },
         numberFormat: '$#,##0.00; ($#,##0.00); -',
     });
     var i = 2;
     for (const [tableKay, item2] of Object.entries(Data)) {
         //console.log(tableKay + '------------');
         let item = JSON.parse(JSON.stringify(item2, function (key, value) {
             return (typeof value === 'number') ? value.toString() : (value == '') ? "-" : (value == 'null') ? "-" : (value == 'undefined') ? "-" : (value == undefined) ? "-" : (value == null) ? "-" : value;
         }));
         let k2 = 1;
         for (const [key, value] of Object.entries(Object.keys(item))) {
             if (tableKay == 0) ws.cell(1, k2).string(_.startCase(value)).style(style2);  // Heading
             ws.cell(i, k2).string(item[value]).style(style); // Content

      k2++;
         } i++;
     };
     let FileResponse = await new Promise(resolve => {
          wb.writeToBuffer().then(async function (buffer) {
             try {
                // console.log(buffer);
                 var fileName = '/report/' + FileName + '-' + moment().format('DDMMYYYYHHmmssms') + '-' + uuidv4() + '.xlsx'; // File name you want to save as in S3
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
     //console.log(FileResponse);
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
                RequestLog['ResponseJson'] = {};
                return response.data.value;
            }).catch(err => {
                RequestLog['ResponseJson'] = JSON.stringify(err);
                return 0;
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
 
module.exports = Common;
