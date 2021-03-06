/*
 * @Author: xinghe
 * @LastEditors: xinghe
 * @Date: 2020-10-11 10:56:30
 * @FilePath: /geleme/src/tree/Provider.ts
 * @LastEditTime: 2020-10-11 21:27:59
 * @不想有bug xinghe@gaoding.com
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import Items from "./TreeItem";
import {  getMore } from "../utils/api";
import { globalConfig } from "../config";
import { rejects } from "assert";

export class Provider implements vscode.TreeDataProvider<StockInfo> {
    private _onDidChangeTreeData: vscode.EventEmitter<StockInfo | null> = new vscode.EventEmitter<StockInfo | null>();

    readonly onDidChangeTreeData: vscode.Event<StockInfo | null> = this
        ._onDidChangeTreeData.event;

    allStockList: StockInfo[];
    constructor() {
        this.allStockList = [];
    }

    getTreeItem(info: StockInfo): Items {
        return new Items(info);
    }

    async getChildren(): Promise<StockInfo[]> {
        // 这里要做2件事情
        //获取 seting中的配置 有的话就请求单个的数据 没有的话就默认请求列表
        let my = vscode.workspace.getConfiguration().get("geleme.my", []);

        const data:any = await getMore({
            // 过滤重复
            stocks: my.length ? Array.from(new Set(my)) + "" : [...globalConfig.defaultStock] + "",
        });
        this.allStockList = this.formatStockData(data.list);
        return this.allStockList;
    }

    /**
     * 刷新
     */
    refresh(): void {
        setTimeout(() => {
            this._onDidChangeTreeData.fire(null);
        }, 200);
        vscode.window.showInformationMessage('割了么提醒您：操作成功！');
    }

    /**
     * 添加股票
     */
    async addItem() {
        const res = await vscode.window.showInputBox({
            placeHolder: "请输入6位数的股票代码！",
            validateInput: (val: string) => {
                const reg = /^\d{6}$/;
                return !reg.test(val) ? "股票代码输入有误" : null;
            },
        });
        if(!res){return;};
        // 是的话再看下是不是有重复的
        if(res){
            const codeList:string[] = vscode.workspace.getConfiguration().get('geleme.my',[]);
            if(codeList.includes(res)){
                vscode.window.showErrorMessage(`割了么提醒您：${res}已存在！`);
                return;
            }
        }
        const data:any = await getMore({ stocks: res });
        // 过滤重复的股票过滤
        const formatData = []
            .concat(data.list, this.allStockList as any);

        this.allStockList = this.formatStockData(formatData);
        this.update();
    }

    /**
     * 删除股票
     * @param code
     */
    deleteItem(code: string) {
        this.allStockList = this.allStockList.filter((v) => v.code !== code);
        this.update();
    }
    /**
     * 整合数据
     * @param data
     */
    formatStockData(data: Array<any>): StockInfo[] {
        const res = data.map((v: StockInfo) => {
            return {
                code: v.code,
                name: v.name,
                openPrice: v.openPrice,
                nowPrice: v.nowPrice,
                diffRate: v.diff_rate,
                diffMoney: v.diff_money,
            };
        });
        return res as StockInfo[];
    }
    /**
     * 更新vscode的设置json
     */
    update() {
        const config = vscode.workspace.getConfiguration();
        // 把数据中的code 都拿出来放到vscode 的 setting.json中
        const codes = this.allStockList.map((v) => v.code);
        config.update("geleme.my", codes, true);
        //再刷新一下数据
        this.refresh();
    }
}
