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

    def update_stocklist(self) -> None:
        df= ef.stock.get_realtime_quotes()
        #print(df)

        codelist = []

        for it in df.itertuples(index=True):
            #print(getattr(it,'股票代码'))
            codelist.append((getattr(it, '股票代码'), getattr(it, '股票名称')))

        with open('./stock_id.list', 'w') as fp:
            json.dump(codelist, fp)

        with open('./stock_id.list', 'r') as fp:
            ls = json.load(fp)
        
        self.__stocklst = ls

    def dump(self) -> None:
        tuple(map(lambda enu: self.__queue[enu[0] % self.__concurrent].append(enu[1]), enumerate(self.__stocklst)))
        thread_lst = tuple(map(lambda q: self.__proc_queue(q), self.__queue))
        tuple(map(lambda th: th.join(), thread_lst))

    def __proc_queue(self, q:list) -> threading.Thread:
        def do_dump(q:list) -> None:
            for id, name in q:
                datafile = f'./data/{id}.data'
                reload = False
                need = DumpStock.datafile_need_refresh(datafile)
                if need > 0:
                    self.__from_date = DumpStock.yesterday()
                    reload = True
                elif need == 0 and self.__strategy == None:
                    continue

                df = ef.stock.get_quote_history(id, beg=self.__from_date, end=self.__today) if need != 0 else DumpStock.load_dataframe(id)
                if reload:
                    print(df)
                    orgdf = DumpStock.load_dataframe(id)
                    df = pd.concat((orgdf, df))
                    #df = orgdf

                hit = self.__strategy.execute(id, df) if self.__strategy != None else False

                with open(datafile, 'w') as fp:
                    #json.dump(df.to_dict(), fp)
                    fp.write(df.to_json(orient='records'))
                    print(f"{id}: {name}, {reload}") if True == hit else None

        th = threading.Thread(target=do_dump, args=(q,))
        th.start()
        print(f'starting thread dump {len(q)} stocks ...')
        return th

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
        with open(f'./data/{id}.data', 'r') as fp:
            obj = json.load(fp)
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
