import efinance as ef
import json, time, threading, copy, os
import pandas as pd
from strategy import StockStrategyBase

'''
Example:
stock_code = '002236'

series = ef.stock.get_base_info(stock_code)
print(series)

df = ef.stock.get_quote_history(stock_code, beg='20181001', end='20210930')
print(df)
df = ef.stock.get_realtime_quotes()
print(df)
'''

class DumpStock:
    def __init__(self, strategy:type=None, idlst:tuple=None, concurrent:int=5) -> None:
        self.__strategy:StockStrategyBase = strategy() if strategy != None else None
        self.__stocklst:tuple = copy.deepcopy(idlst)
        self.__concurrent:int = concurrent
        self.__queue:list = []
        self.__from_date = '20180101'
        self.__today = DumpStock.today()
        self.__refresh:bool = False
        for i in range(self.__concurrent):
            self.__queue.append([])

        self.__total_hit_r = 0
        self.__total_hit_g = 0
        self.__total_hit_0 = 0
        self.__total_protect = threading.Lock()
        self.__hit_r:list = []
        self.__hit_g:list = []

    def update_stocklist(self) -> None:
        df= ef.stock.get_realtime_quotes()
        #print(df)

        with open('./stock_id.list', 'w') as fp:
            fp.write(df.to_json(orient='records'))

        with open('./stock_id.list', 'r') as fp:
            self.__stocklst = json.load(fp)

    def dump(self) -> None:
        tuple(map(lambda enu: self.__queue[enu[0] % self.__concurrent].append(enu[1]), enumerate(self.__stocklst)))
        thread_lst = tuple(map(lambda q: self.__proc_queue(q), self.__queue))
        tuple(map(lambda th: th.join(), thread_lst))

        with open(f'./data/hit_r_{self.__today}', 'w') as fp:
            json.dump(self.__hit_r, fp)
        with open(f'./data/hit_g_{self.__today}', 'w') as fp:
            json.dump(self.__hit_g, fp)
        
        print(f"总计: {self.__total_hit_r+self.__total_hit_g+self.__total_hit_0}, 上涨: {self.__total_hit_r}, 下跌: {self.__total_hit_g}, 无法判断: {self.__total_hit_0}")

    def __proc_queue(self, q:list) -> threading.Thread:
        def do_dump(q:list) -> None:
            for stock_info in q:
                #print(f'info: {stock_info}')
                id = stock_info.get('股票代码')
                datafile = f'./data/{id}.data'
                reload = False
                need = DumpStock.datafile_need_refresh(datafile)
                if need > 0:
                    self.__from_date = DumpStock.yesterday()
                    reload = True
                elif need == 0 and self.__strategy == None:
                    continue

                df = ef.stock.get_quote_history(id, beg=self.__from_date, end=self.__today) if need != 0 else DumpStock.load_dataframe(id)
                if df.empty:
                    #print(f'WARN: stock {id} has no data')
                    continue

                if reload:
                    #print(df)
                    orgdf = DumpStock.load_dataframe(id)
                    df = pd.concat((orgdf, df))
                    #df = orgdf

                hit = self.__strategy.execute(id, stock_info, df) if self.__strategy != None else False
                self.__inc_total(id, hit)

                with open(datafile, 'w') as fp:
                    #json.dump(df.to_dict(), fp)
                    fp.write(df.to_json(orient='records'))
                    print(f"HIT{'涨' if hit > 0 else '跌'}: {id}: {stock_info.get('股票名称')}, 流通市值{round(float(stock_info.get('流通市值'))/100000000.0,2)}亿元") if hit != 0 else None

        th = threading.Thread(target=do_dump, args=(q,))
        th.start()
        print(f'starting thread dump {len(q)} stocks ...')
        return th

    def __inc_total(self, id:str, hit:int) -> None:
        with self.__total_protect:
            if hit > 0:
                self.__total_hit_r += 1
                self.__hit_r.append(id)
            elif hit < 0:
                self.__total_hit_g += 1
                self.__hit_g.append(id)
            else:
                self.__total_hit_0 += 1

    @staticmethod
    def datafile_need_refresh(file:str) -> int:
        '''
        Return:
            0: 不需要拉取数据
            1: 拉取最新的
            -1: 拉取全量
        '''
        if os.path.exists(file):
            ret = 0 if (time.time() - os.path.getmtime(file)) < 86400 else 1
        else:
            ret = -1
        return ret

    @staticmethod
    def load(id:str) -> dict:
        obj = {}
        with open(f'./data/{id}.data', 'r') as fp:
            try:
                obj = json.load(fp)
            except json.JSONDecodeError as e:
                print(f"WARN: stock {id} data invalid")
            except Exception as e:
                print(f'FATAL: stock {id} load fail - {e}')
        return obj

    @staticmethod
    def load_dataframe(id:str) -> pd.DataFrame:
        return pd.json_normalize(DumpStock.load(id))

    @staticmethod
    def yesterday() -> str:
        return time.strftime("%Y%m%d", time.localtime(time.time()-86400))

    @staticmethod
    def today() -> str:
        return time.strftime("%Y%m%d", time.localtime())
